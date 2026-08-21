import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { BODY_CHAR_CAP, EVENT_CAP } from "@mediajel/tracker-widget/session/bounds";
import { WIDGET_SESSION_KEY } from "@mediajel/tracker-widget/session/keys";
import { PERSIST_DEBOUNCE_MS, SessionStore, createSessionStore } from "@mediajel/tracker-widget/session/store";
import { WIDGET_SESSION_VERSION } from "@mediajel/tracker-widget/types";

import { FakeStorage, makeEvent, makeSession, sleep } from "../helpers";

let storage: FakeStorage;
let store: SessionStore | null = null;

const open = (): SessionStore => {
  store = createSessionStore(storage);
  return store;
};

const persisted = () => JSON.parse(storage.getItem(WIDGET_SESSION_KEY) as string);

beforeEach(() => {
  storage = new FakeStorage();
});

afterEach(() => {
  store?.dispose();
  store = null;
});

describe("loading", () => {
  test("starts a fresh session when nothing is stored", () => {
    const session = open().get();

    expect(session.v).toBe(WIDGET_SESSION_VERSION);
    expect(session.step).toBe("home");
    expect(session.timeline).toEqual([]);
    expect(session.markedIds).toEqual([]);
    expect(session.id).not.toBe("");
  });

  test("restores the persisted step so resume() re-enters where the operator left off", () => {
    storage.setItem(
      WIDGET_SESSION_KEY,
      JSON.stringify(makeSession({ step: "review", timeline: [makeEvent({ kind: "network" })] })),
    );

    const session = open().get();

    expect(session.step).toBe("review");
    expect(session.timeline).toHaveLength(1);
    expect(session.id).toBe("s1");
  });

  test("discards a session written by an older schema", () => {
    storage.setItem(WIDGET_SESSION_KEY, JSON.stringify({ ...makeSession({ step: "verify" }), v: 0 }));
    expect(open().get().step).toBe("home");
  });

  test("discards unparseable storage instead of throwing on a client's page", () => {
    storage.setItem(WIDGET_SESSION_KEY, "{not json");
    expect(open().get().step).toBe("home");
  });

  test("survives a storage that refuses to be read at all", () => {
    const hostile = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    } as unknown as Storage;

    expect(createSessionStore(hostile).get().step).toBe("home");
  });
});

describe("update", () => {
  test("hands back a new top-level object so preact sees the change", () => {
    const s = open();
    const before = s.get();
    const after = s.update((draft) => {
      draft.step = "recording";
    });

    expect(after).not.toBe(before);
    expect(after.step).toBe("recording");
    expect(s.get()).toBe(after);
  });

  test("notifies subscribers and stops after unsubscribe", () => {
    const s = open();
    const seen: string[] = [];
    const off = s.subscribe((session) => seen.push(session.step));

    s.update((draft) => {
      draft.step = "recording";
    });
    off();
    s.update((draft) => {
      draft.step = "review";
    });

    expect(seen).toEqual(["recording"]);
  });

  test("clamps oversized bodies as they land", () => {
    const s = open();
    const session = s.update((draft) => {
      draft.timeline.push(makeEvent({ kind: "network", resBody: "x".repeat(BODY_CHAR_CAP * 3) }));
    });

    const event = session.timeline[0];
    if (event.kind !== "network") throw new Error("unreachable");
    expect(event.resBody.length).toBe(BODY_CHAR_CAP);
  });

  test("holds the timeline at EVENT_CAP, dropping cheap evidence and flagging truncation", () => {
    const s = open();
    s.update((draft) => {
      for (let i = 0; i < EVENT_CAP; i += 1) draft.timeline.push(makeEvent({ kind: "dom" }));
      draft.timeline.push(makeEvent({ id: "keeper", kind: "network" }));
    });

    const session = s.get();
    expect(session.timeline).toHaveLength(EVENT_CAP);
    expect(session.truncated).toBe(true);
    expect(session.timeline.some((event) => event.id === "keeper")).toBe(true);
  });

  test("keeps marked events even when that pushes past EVENT_CAP", () => {
    const s = open();
    const marked = Array.from({ length: EVENT_CAP + 5 }, (_, i) => `m${i}`);
    s.update((draft) => {
      draft.markedIds = marked;
      for (const id of marked) draft.timeline.push(makeEvent({ id, kind: "dom" }));
    });

    expect(s.get().timeline).toHaveLength(EVENT_CAP + 5);
  });
});

describe("persistence", () => {
  test("does not write on every update — it debounces", () => {
    const s = open();
    s.update((draft) => {
      draft.step = "recording";
    });
    s.update((draft) => {
      draft.step = "review";
    });

    expect(storage.getItem(WIDGET_SESSION_KEY)).toBeNull();
    expect(storage.writes).toBe(0);
  });

  test("writes once the debounce elapses", async () => {
    const s = open();
    s.update((draft) => {
      draft.step = "recording";
    });

    await sleep(PERSIST_DEBOUNCE_MS + 60);

    expect(persisted().step).toBe("recording");
    expect(storage.writes).toBe(1);
  });

  test("flush() writes synchronously and cancels the pending debounce", async () => {
    const s = open();
    s.update((draft) => {
      draft.step = "recording";
    });
    s.flush();

    expect(persisted().step).toBe("recording");

    await sleep(PERSIST_DEBOUNCE_MS + 60);
    expect(storage.writes).toBe(1);
  });

  test.each(["pagehide", "beforeunload"])("flushes on %s", (name) => {
    const s = open();
    s.update((draft) => {
      draft.step = "recording";
    });

    window.dispatchEvent(new Event(name));

    expect(persisted().step).toBe("recording");
  });

  test("flushes when the tab is hidden, not when it is shown again", () => {
    const s = open();
    s.update((draft) => {
      draft.step = "recording";
    });

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(storage.getItem(WIDGET_SESSION_KEY)).toBeNull();

    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(persisted().step).toBe("recording");
  });

  test("dispose() detaches the lifecycle listeners and drops the pending write", async () => {
    const s = open();
    s.update((draft) => {
      draft.step = "recording";
    });
    s.dispose();
    store = null;

    window.dispatchEvent(new Event("pagehide"));
    await sleep(PERSIST_DEBOUNCE_MS + 60);

    expect(storage.writes).toBe(0);
  });
});

describe("quota", () => {
  test("evicts and retries when the browser refuses the write, and records truncation", () => {
    const s = open();
    s.update((draft) => {
      for (let i = 0; i < 20; i += 1) draft.timeline.push(makeEvent({ kind: "dom" }));
    });

    // Only a session with a handful of events left will fit.
    storage.quota = JSON.stringify(s.get()).length / 3;
    s.flush();

    const written = persisted();
    expect(written.truncated).toBe(true);
    expect(written.timeline.length).toBeLessThan(20);
    expect(storage.writes).toBeGreaterThan(1);
    expect(s.get().truncated).toBe(true);
  });

  test("keeps marked events even when that means giving up on the write", () => {
    const s = open();
    s.update((draft) => {
      draft.markedIds = ["keep"];
      draft.timeline.push(makeEvent({ id: "keep", kind: "dom" }));
      for (let i = 0; i < 10; i += 1) draft.timeline.push(makeEvent({ kind: "click" }));
    });

    storage.quota = 10; // nothing we are allowed to drop will ever make this fit
    expect(() => s.flush()).not.toThrow();

    expect(storage.getItem(WIDGET_SESSION_KEY)).toBeNull();
    expect(s.get().timeline.some((event) => event.id === "keep")).toBe(true);
  });
});

describe("reset", () => {
  test("starts a new session, persists it immediately and notifies", () => {
    const s = open();
    s.update((draft) => {
      draft.step = "review";
      draft.timeline.push(makeEvent({ kind: "dom" }));
    });
    const first = s.get().id;

    const seen: string[] = [];
    s.subscribe((session) => seen.push(session.step));
    const fresh = s.reset();

    expect(fresh.id).not.toBe(first);
    expect(fresh.step).toBe("home");
    expect(fresh.timeline).toEqual([]);
    expect(persisted().id).toBe(fresh.id);
    expect(seen).toEqual(["home"]);
  });

  test("carries the goal over when asked", () => {
    expect(open().reset({ goal: "signup" }).goal).toBe("signup");
  });
});

const setVisibility = (state: "visible" | "hidden"): void => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
};
