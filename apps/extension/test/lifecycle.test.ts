import { beforeEach, describe, expect, test } from "bun:test";

import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";

import { JobView } from "~/bridge/api";
import { BridgeDown } from "~/bridge/protocol";
import { hear } from "~/background/beacons";
import { handle, rememberStatus } from "~/background/handle";
import { writeSession } from "~/store/auth";
import { clearAllJobs, openJob, peekJob, releaseJob } from "~/store/jobs";
import { clearExtensionStorage } from "./setup";

/**
 * What a recycled service worker must not break.
 *
 * Chrome stops this worker whenever it looks idle, and a recording is minutes of the panel
 * saying nothing to it — so `live` being empty when the next request arrives is the normal
 * case, not the rare one. Requests from the PANEL are the exposed path: the relay's port
 * listener rehydrates with `openJob` before it dispatches, but `chrome.runtime.onMessage` hands
 * straight to `handle`. Every test here recycles the worker with `releaseJob` (which persists,
 * then drops the in-memory copy — exactly what a shutdown does) and then asks the panel's
 * question.
 */

const SITE = "shop.example.com";
const TAB = 1;

const sent: BridgeDown[] = [];
const send = (_tabId: number, message: BridgeDown): boolean => {
  sent.push(message);
  return true;
};
const push = (): void => undefined;

/** The worker goes away; storage does not. */
const recycle = (): void => releaseJob(SITE);

beforeEach(async () => {
  await clearAllJobs();
  clearExtensionStorage();
  sent.length = 0;
  await openJob(SITE);
});

describe("stopping a recording after the worker has been recycled", () => {
  test("still advances to review — the operator's Stop is not swallowed", async () => {
    await handle({ type: "page/start-recording", tabId: TAB, goal: "transaction" }, send, push);
    expect(peekJob(SITE)?.step).toBe("recording");

    recycle();

    const step = await handle({ type: "page/stop-recording", tabId: TAB }, send, push);
    expect(step).toBe("review");
    expect(peekJob(SITE)?.step).toBe("review");
  });

  test("still tells the page to stop, so the recorder does not keep running", async () => {
    await handle({ type: "page/start-recording", tabId: TAB, goal: "transaction" }, send, push);
    recycle();
    sent.length = 0;

    await handle({ type: "page/stop-recording", tabId: TAB }, send, push);
    expect(sent).toContainEqual({ type: "stop-recording" });
  });

  test("keeps the recording it made rather than starting the step over", async () => {
    await handle({ type: "page/start-recording", tabId: TAB, goal: "signup" }, send, push);
    const startedAt = peekJob(SITE)?.startedAt;

    recycle();
    await handle({ type: "page/stop-recording", tabId: TAB }, send, push);

    expect(peekJob(SITE)?.startedAt).toBe(startedAt!);
    expect(peekJob(SITE)?.goal).toBe("signup");
  });
});

describe("job/advance after the worker has been recycled", () => {
  test("performs the move instead of reporting home — home is the reset, and would read as lost work", async () => {
    await handle({ type: "page/start-recording", tabId: TAB, goal: "transaction" }, send, push);
    await handle({ type: "page/stop-recording", tabId: TAB }, send, push);

    recycle();

    const step = await handle({ type: "job/advance", tabId: TAB, to: "recording" }, send, push);
    expect(step).toBe("recording");
    expect(peekJob(SITE)?.step).toBe("recording");
  });

  test("still refuses an illegal move rather than inventing one", async () => {
    recycle();

    const step = await handle({ type: "job/advance", tabId: TAB, to: "deploy" }, send, push);
    expect(step).toBe("home");
    expect(peekJob(SITE)?.step).toBe("home");
  });
});

describe("what the panel is told about the page", () => {
  const STATUS: TrackerStatus = {
    appId: "acme",
    environment: "production",
    version: "2",
    event: "",
    collector: "",
    tagPresent: true,
    tags: [{ appId: "acme", environment: "production", version: "2", delayed: false }],
    trackTransPresent: true,
    optedOut: false,
    warnings: [],
  };

  test("never hands back the tags of the site the tab was on before", async () => {
    rememberStatus(TAB, "previous-client.example", STATUS);
    expect(((await handle({ type: "job/open", tabId: TAB }, send, push)) as JobView | null)?.status).toBeNull();

    rememberStatus(TAB, SITE, STATUS);
    expect(((await handle({ type: "job/open", tabId: TAB }, send, push)) as JobView | null)?.status).toEqual(STATUS);
  });

  test("hands the panel the tags this tab has been heard sending, even before the page reports", async () => {
    await hear(TAB, SITE, ["heard-app"]);
    expect(((await handle({ type: "job/open", tabId: TAB }, send, push)) as JobView | null)?.heard).toEqual([
      "heard-app",
    ]);
  });

  test("looks tag activity up with the signed-in user's token — the panel never holds one", async () => {
    process.env.PLASMO_PUBLIC_WIDGET_API_URL = "https://assistant.test";
    await writeSession({
      idToken: "id-token-activity",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60 * 60_000,
      identity: { username: "dana", email: "dana@mediajel.com", name: "Dana" },
    });
    const original = globalThis.fetch;
    const seen: { url: string; authorization: string }[] = [];
    globalThis.fetch = (async (input: string, init?: RequestInit) => {
      seen.push({ url: String(input), authorization: (init?.headers as Record<string, string>).authorization });
      return new Response(JSON.stringify({ days: 7, tags: [] }), { status: 200 });
    }) as typeof fetch;

    try {
      await handle({ type: "service/tag-activity", appIds: ["acme"] }, send, push);
    } finally {
      globalThis.fetch = original;
    }

    expect(seen).toEqual([
      { url: "https://assistant.test/activity?appIds=acme", authorization: "Bearer id-token-activity" },
    ]);
  });
});

describe("a request this background does not know", () => {
  test("is refused in words, rather than answered with nothing", async () => {
    await expect(handle({ type: "service/from-a-newer-panel" } as never, send, push)).rejects.toThrow(/does not know/);
  });
});
