import { beforeEach, describe, expect, test } from "bun:test";

import { JobView } from "~/bridge/api";
import { BridgeDown } from "~/bridge/protocol";
import { handle } from "~/background/handle";
import { learn } from "~/background/tag-state";
import { readSession, writeSession } from "~/store/auth";
import { failureAnswer } from "~/background/answer";
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
const send = async (_tabId: number, message: BridgeDown): Promise<boolean> => {
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
  const open = async (): Promise<JobView | null> =>
    (await handle({ type: "job/open", tabId: TAB }, send, push)) as JobView | null;

  test("never hands back the tags of the site the tab was on before", async () => {
    await learn(TAB, "previous-client.example", { kind: "beacon", appIds: ["theirs"] });
    expect((await open())?.tags).toEqual([]);

    await learn(TAB, SITE, { kind: "beacon", appIds: ["ours"] });
    expect((await open())?.tags.map((tag) => [tag.appId, tag.state])).toEqual([["ours", "sending"]]);
  });

  test("reads the page's scripts itself, so a worker that lost the page's word still knows its tags", async () => {
    const scripting = (chrome as unknown as { scripting: Record<string, unknown> }).scripting;
    const original = scripting.executeScript;
    document.head.innerHTML = `<script src="https://tags.cnna.io/?appId=Eaze&version=2" id="mediajel" data-nscript="afterInteractive"></script>`;
    // Run the injected function here, against this document, the way Chrome runs it in the tab.
    scripting.executeScript = async ({ func, args }: { func: (...a: unknown[]) => unknown; args: unknown[] }) => [
      { frameId: 0, result: func(...args) },
    ];
    try {
      const view = await open();
      expect(view?.tags).toMatchObject([
        { appId: "Eaze", state: "installed", environment: "production", version: "2", announced: false },
      ]);
      expect(view?.status.appId).toBe("Eaze");

      scripting.executeScript = async () => {
        throw new Error("Cannot access contents of the page.");
      };
      // A page that cannot be read keeps what was known; it is not a page without tags.
      expect((await open())?.tags.map((tag) => tag.appId)).toEqual(["Eaze"]);
    } finally {
      scripting.executeScript = original;
      document.head.innerHTML = "";
    }
  });

  test("says whether the page has settled, and derives the warnings from what is known", async () => {
    expect(await open()).toMatchObject({ settled: false, status: { warnings: [] } });
    await learn(TAB, SITE, { kind: "settled" });
    const view = await open();
    expect(view?.settled).toBe(true);
    expect(view?.status.warnings.join(" ")).toContain("No MediaJel tag has spoken up");
    expect(view?.status.warnings.join(" ")).not.toMatch(/reload/i);
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

describe("a session that ends while the operator works", () => {
  const signIn = (): Promise<void> =>
    writeSession({
      idToken: "id-token-rejected",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60 * 60_000,
      identity: { username: "dana", email: "dana@mediajel.com", name: "Dana" },
    });

  const refusing = async <T>(run: () => Promise<T>): Promise<T> => {
    process.env.PLASMO_PUBLIC_WIDGET_API_URL = "https://assistant.test";
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: { code: "unauthorized", message: "Your MediaJel session has expired. Sign in again." },
        }),
        { status: 401 },
      )) as unknown as typeof fetch;
    try {
      return await run();
    } finally {
      globalThis.fetch = original;
    }
  };

  test("a refused request clears the session and is answered as signed out, the reason with it", async () => {
    await signIn();
    const failure = await refusing(() =>
      handle({ type: "service/tag-activity", appIds: ["acme"] }, send, push).then(
        () => null,
        (err: unknown) => failureAnswer(err),
      ),
    );

    expect(failure).toEqual({
      ok: false,
      error: "Your MediaJel session has expired. Sign in again.",
      code: "signed-out",
    });
    expect(await readSession()).toBeNull();
  });

  test("a failure that is not about the session leaves the operator signed in", async () => {
    await signIn();
    const failure = await failureAnswer(
      Object.assign(new Error("Tag activity isn't set up."), { code: "activity-not-configured" }),
    );

    expect(failure).toEqual({ ok: false, error: "Tag activity isn't set up.", code: "activity-not-configured" });
    expect(await readSession()).not.toBeNull();
  });

  test("a generation refused mid-run sends the panel to sign in", async () => {
    await signIn();
    const pushed: unknown[] = [];
    await refusing(async () => {
      await handle({ type: "service/generate", tabId: TAB }, send, (_tabId, message) => pushed.push(message));
      for (let i = 0; i < 50 && pushed.length === 0; i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(pushed).toEqual([{ type: "signed-out", message: "Your MediaJel session has expired. Sign in again." }]);
    expect(await readSession()).toBeNull();
  });
});

describe("a tab open before the extension was", () => {
  test("is attached to on the first command nothing in it could receive, then told", async () => {
    const chromeApi = (globalThis as unknown as { chrome: { scripting: Record<string, unknown> } }).chrome;
    const original = chromeApi.scripting.executeScript;
    const injected: string[] = [];
    chromeApi.scripting.executeScript = async ({ files, world }: { files: string[]; world?: string }) => {
      injected.push(`${world ?? "ISOLATED"}:${files.join(",")}`);
      return [];
    };
    let attached = false;
    const delivered: BridgeDown[] = [];
    const sendOnceAttached = async (_tabId: number, message: BridgeDown): Promise<boolean> => {
      if (!attached && injected.length === 2) attached = true;
      if (attached) delivered.push(message);
      return attached;
    };
    try {
      await handle({ type: "page/start-recording", tabId: TAB, goal: "transaction" }, sendOnceAttached, push);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(injected).toEqual(["ISOLATED:relay.test.js", "MAIN:page-bridge.test.js"]);
      expect(delivered.map((message) => message.type)).toEqual(["start-recording"]);
    } finally {
      chromeApi.scripting.executeScript = original;
    }
  });

  test("a page Chrome keeps extensions out of says so, and never asks for a reload", async () => {
    const chromeApi = (globalThis as unknown as { chrome: { scripting: Record<string, unknown> } }).chrome;
    const original = chromeApi.scripting.executeScript;
    chromeApi.scripting.executeScript = async () => {
      throw new Error("Cannot access a chrome:// URL");
    };
    const unreachable = async (): Promise<boolean> => false;
    try {
      await handle({ type: "page/start-recording", tabId: TAB, goal: "transaction" }, unreachable, push);
      await handle({ type: "job/advance", tabId: TAB, to: "review" }, unreachable, push);
      const failure = await handle(
        { type: "page/inject-tag", tabId: TAB, url: "https://tags.cnna.io/?appId=x" },
        unreachable,
        push,
      ).catch((err: unknown) => err);
      expect((failure as Error).message).toContain("Chrome does not allow extensions on it");
      expect((failure as Error).message).not.toMatch(/reload/i);
    } finally {
      chromeApi.scripting.executeScript = original;
    }
  });
});

describe("a request this background does not know", () => {
  test("is refused in words, rather than answered with nothing", async () => {
    await expect(handle({ type: "service/from-a-newer-panel" } as never, send, push)).rejects.toThrow(/does not know/);
  });
});
