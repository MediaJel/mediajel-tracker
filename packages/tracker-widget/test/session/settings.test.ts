import { beforeEach, describe, expect, test } from "bun:test";

import { WIDGET_SETTINGS_KEY } from "@mediajel/tracker-widget/session/keys";
import {
  DEFAULT_SETTINGS,
  SettingsStore,
  createSettingsStore,
  maskSecret,
} from "@mediajel/tracker-widget/session/settings";

import { FakeStorage } from "../helpers";

let session: FakeStorage;
let local: FakeStorage;

const open = (): SettingsStore => createSettingsStore(session, local);
const stored = (storage: FakeStorage) => {
  const raw = storage.getItem(WIDGET_SETTINGS_KEY);
  return raw === null ? null : JSON.parse(raw);
};

beforeEach(() => {
  session = new FakeStorage();
  local = new FakeStorage();
});

describe("defaults", () => {
  test("starts empty, un-acknowledged and not remembered", () => {
    const settings = open().get();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.githubToken).toBe("");
    expect(settings.remember).toBe(false);
    expect(settings.acknowledgedDataSharing).toBe(false);
    expect(settings.actor).toEqual({ name: "", email: "" });
  });

  test("writes nothing until something is set", () => {
    open();
    expect(stored(session)).toBeNull();
    expect(stored(local)).toBeNull();
  });
});

describe("storage area", () => {
  test("keeps settings in sessionStorage by default", () => {
    open().update({ githubToken: "ghp_live_1" });

    expect(stored(session).githubToken).toBe("ghp_live_1");
    expect(stored(local)).toBeNull();
  });

  test("remember: true moves the record to localStorage and clears the tab copy", () => {
    const store = open();
    store.update({ githubToken: "ghp_live_1" });
    store.update({ remember: true });

    expect(stored(local).githubToken).toBe("ghp_live_1");
    expect(stored(local).remember).toBe(true);
    expect(stored(session)).toBeNull();
  });

  test("remember: false moves it back and leaves nothing on disk", () => {
    const store = open();
    store.update({ githubToken: "ghp_live_1", remember: true });
    store.update({ remember: false });

    expect(stored(session).githubToken).toBe("ghp_live_1");
    expect(stored(local)).toBeNull();
  });

  test("a remembered record is found again in a brand new tab", () => {
    open().update({ githubToken: "ghp_live_1", actor: { name: "Dana" }, remember: true });

    const reopened = createSettingsStore(new FakeStorage(), local).get();

    expect(reopened.githubToken).toBe("ghp_live_1");
    expect(reopened.actor.name).toBe("Dana");
    expect(reopened.remember).toBe(true);
  });

  test("the remembered record wins over a stale tab record", () => {
    session.setItem(WIDGET_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, githubToken: "stale" }));
    local.setItem(
      WIDGET_SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, githubToken: "remembered", remember: true }),
    );

    expect(open().get().githubToken).toBe("remembered");
  });

  test("forget() erases both areas and returns to the defaults", () => {
    const store = open();
    store.update({ githubToken: "ghp_1", actor: { name: "Dana" }, remember: true });

    store.forget();

    expect(stored(session)).toBeNull();
    expect(stored(local)).toBeNull();
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
  });

  test("survives storage that throws on read", () => {
    const hostile = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    } as unknown as Storage;

    expect(createSettingsStore(hostile, hostile).get()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("update", () => {
  test("merges the actor one level deep so a name does not wipe an email", () => {
    const store = open();
    store.update({ actor: { name: "Dana Reyes", email: "dana@mediajel.com" } });
    store.update({ actor: { name: "Dana R." } });

    expect(store.get().actor).toEqual({ name: "Dana R.", email: "dana@mediajel.com" });
  });

  test("ignores keys it does not own", () => {
    const store = open();
    store.update({ githubToken: "ghp_1", collector: "https://evil.example" } as never);

    expect((store.get() as unknown as Record<string, unknown>).collector).toBeUndefined();
    expect(stored(session).collector).toBeUndefined();
  });

  test("notifies subscribers and stops after unsubscribe", () => {
    const store = open();
    const seen: string[] = [];
    const off = store.subscribe((settings) => seen.push(settings.actor.name));

    store.update({ actor: { name: "Dana" } });
    off();
    store.update({ actor: { name: "Sam" } });

    expect(seen).toEqual(["Dana"]);
  });

  test("returns the new settings and a new object reference", () => {
    const store = open();
    const before = store.get();
    const after = store.update({ githubToken: "ghp_5" });

    expect(after).not.toBe(before);
    expect(after.githubToken).toBe("ghp_5");
    expect(store.get()).toBe(after);
  });
});

describe("maskSecret", () => {
  test("shows the first and last four of a real key", () => {
    const masked = maskSecret("sk-ant-api03-abcdefghijklmnop-7f2c");

    expect(masked.startsWith("sk-a")).toBe(true);
    expect(masked.endsWith("7f2c")).toBe(true);
    expect(masked).not.toContain("abcdefghijklmnop");
  });

  test("reveals nothing at all about a short secret", () => {
    expect(maskSecret("short")).toBe("••••••••");
  });

  test("hides how long the secret is", () => {
    expect(maskSecret("A".repeat(40) + "wxyz")).toBe(maskSecret("A".repeat(400) + "wxyz"));
  });

  test("an empty secret masks to nothing, so the UI can show its placeholder", () => {
    expect(maskSecret("")).toBe("");
  });
});

describe("corrupted records", () => {
  test('a stored remember: "yes" does not route secrets to localStorage', () => {
    const sessionArea = new FakeStorage();
    const localArea = new FakeStorage();
    sessionArea.setItem(
      WIDGET_SETTINGS_KEY,
      JSON.stringify({ githubToken: 42, remember: "yes", provider: "gateway", apiKey: "sk-old-build-key" }),
    );

    const s = createSettingsStore(sessionArea, localArea);
    expect(s.get().remember).toBe(false);
    expect(s.get().githubToken).toBe(""); // non-string dropped
    const record = s.get() as unknown as Record<string, unknown>;
    expect(record.provider).toBeUndefined(); // keys from earlier builds fall away
    expect(record.apiKey).toBeUndefined();

    s.update({ githubToken: "ghp_fresh" });
    expect(localArea.getItem(WIDGET_SETTINGS_KEY)).toBeNull(); // still per-tab
    expect(sessionArea.getItem(WIDGET_SETTINGS_KEY)).toContain("ghp_fresh");
    expect(sessionArea.getItem(WIDGET_SETTINGS_KEY)).not.toContain("sk-old-build-key");
  });
});
