import { beforeEach, describe, expect, test } from "bun:test";

import { BridgeDown } from "~/bridge/protocol";
import { handle } from "~/background/handle";
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
