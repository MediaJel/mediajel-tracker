import { beforeEach, describe, expect, test } from "bun:test";

import { TimelineEvent } from "@mediajel/assistant-core/types";

import {
  advance,
  clearAllJobs,
  deleteJob,
  listJobs,
  openJob,
  peekJob,
  releaseJob,
  resetJob,
  updateJob,
} from "~/store/jobs";
import { clearExtensionStorage } from "./setup";

/**
 * The job store is the thing the extension exists for: a recording that outlives the tab it was
 * made in. What is worth testing here is what would silently lose work — a write that never
 * lands, a step change that bypasses the machine, one site's job leaking into another's.
 */

const event = (id: string): TimelineEvent =>
  ({ id, t: 0, pageId: "pg-1", kind: "click", summary: `click ${id}`, score: 1 }) as TimelineEvent;

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 260));

beforeEach(async () => {
  await clearAllJobs();
  clearExtensionStorage();
});

describe("openJob", () => {
  test("starts a fresh job for a site that has none, at step home", async () => {
    const session = await openJob("shop.example.com");
    expect(session.step).toBe("home");
    expect(session.timeline).toEqual([]);
    expect(session.goal).toBe("transaction");
  });

  test("honours the goal a new job is opened with", async () => {
    const session = await openJob("signups.example.com", { goal: "signup" });
    expect(session.goal).toBe("signup");
  });

  test("returns the same live object on re-open rather than reloading a stale copy", async () => {
    const first = await openJob("shop.example.com");
    updateJob("shop.example.com", (draft) => draft.timeline.push(event("a")));
    const second = await openJob("shop.example.com");
    expect(second.timeline).toHaveLength(1);
    expect(second).not.toBe(first); // update installs a new object; identity changes with content
  });
});

describe("updateJob", () => {
  test("gives every update a fresh timeline array, so a previous session object is never mutated", async () => {
    await openJob("shop.example.com");
    const before = peekJob("shop.example.com");
    updateJob("shop.example.com", (draft) => draft.timeline.push(event("a")));
    const after = peekJob("shop.example.com");

    expect(before?.timeline).toHaveLength(0);
    expect(after?.timeline).toHaveLength(1);
    expect(after?.timeline).not.toBe(before?.timeline);
  });

  test("refuses a step written as data — transitions go through advance()", async () => {
    await openJob("shop.example.com");
    updateJob("shop.example.com", (draft) => {
      draft.step = "done";
    });
    expect(peekJob("shop.example.com")?.step).toBe("home");
  });

  test("keeps one site's events out of another's job", async () => {
    await openJob("a.example.com");
    await openJob("b.example.com");
    updateJob("a.example.com", (draft) => draft.timeline.push(event("only-a")));

    expect(peekJob("a.example.com")?.timeline).toHaveLength(1);
    expect(peekJob("b.example.com")?.timeline).toHaveLength(0);
  });

  test("does nothing for a site that was never opened", () => {
    expect(updateJob("never.example.com", (draft) => draft.timeline.push(event("x")))).toBeNull();
  });
});

describe("persistence", () => {
  test("a debounced write reaches storage, and re-opening after a restart finds it", async () => {
    await openJob("shop.example.com");
    updateJob("shop.example.com", (draft) => draft.timeline.push(event("a")));
    await settle();

    // What a browser restart looks like from here: the in-memory mirror is gone, storage is not.
    releaseJob("shop.example.com");
    const reopened = await openJob("shop.example.com");
    expect(reopened.timeline.map((entry) => entry.id)).toEqual(["a"]);
  });

  test("a flushed event does not wait for the debounce — the purchase IS the navigation", async () => {
    await openJob("shop.example.com");
    updateJob("shop.example.com", (draft) => draft.timeline.push(event("checkout")), { flush: true });

    // No settle(): if this needed the debounce, the page could be gone before it fired.
    await Promise.resolve();
    releaseJob("shop.example.com");
    const reopened = await openJob("shop.example.com");
    expect(reopened.timeline.map((entry) => entry.id)).toEqual(["checkout"]);
  });

  test("a step change is written immediately", async () => {
    await openJob("shop.example.com");
    advance("shop.example.com", "recording");
    await Promise.resolve();

    releaseJob("shop.example.com");
    expect((await openJob("shop.example.com")).step).toBe("recording");
  });
});

describe("advance", () => {
  test("runs the machine: a legal move is taken, an illegal one is refused", async () => {
    await openJob("shop.example.com");
    expect(advance("shop.example.com", "recording")).toBe("recording");
    expect(advance("shop.example.com", "deploy")).toBe("recording");
  });

  test("only a confirmed reset may go back to home", async () => {
    await openJob("shop.example.com");
    advance("shop.example.com", "recording");
    expect(advance("shop.example.com", "home")).toBe("recording");
    expect(advance("shop.example.com", "home", { confirmed: true })).toBe("home");
  });
});

describe("the job list", () => {
  test("names every site with a job, most recently touched first", async () => {
    await openJob("first.example.com");
    updateJob("first.example.com", (draft) => draft.timeline.push(event("a")), { flush: true });
    await openJob("second.example.com");
    updateJob("second.example.com", (draft) => draft.timeline.push(event("b")), { flush: true });
    await settle();

    const jobs = await listJobs();
    expect(jobs.map((job) => job.site)).toEqual(["second.example.com", "first.example.com"]);
    expect(jobs[0].events).toBe(1);
    expect(jobs[0].deployed).toBe(false);
  });

  test("forgets a deleted job, in memory and in storage", async () => {
    await openJob("shop.example.com");
    updateJob("shop.example.com", (draft) => draft.timeline.push(event("a")), { flush: true });
    await settle();

    await deleteJob("shop.example.com");
    expect(peekJob("shop.example.com")).toBeNull();
    expect(await listJobs()).toEqual([]);
    expect((await openJob("shop.example.com")).timeline).toEqual([]);
  });
});

describe("resetJob", () => {
  test("throws the recording away and keeps the goal it is given", async () => {
    await openJob("shop.example.com", { goal: "signup" });
    updateJob("shop.example.com", (draft) => draft.timeline.push(event("a")));
    const fresh = await resetJob("shop.example.com", { goal: "signup" });

    expect(fresh.timeline).toEqual([]);
    expect(fresh.goal).toBe("signup");
    expect(fresh.step).toBe("home");
  });
});
