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
    expect(settings.apiKey).toBe("");
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
    open().update({ apiKey: "sk-live-1" });

    expect(stored(session).apiKey).toBe("sk-live-1");
    expect(stored(local)).toBeNull();
  });

  test("remember: true moves the record to localStorage and clears the tab copy", () => {
    const store = open();
    store.update({ apiKey: "sk-live-1" });
    store.update({ remember: true });

    expect(stored(local).apiKey).toBe("sk-live-1");
    expect(stored(local).remember).toBe(true);
    expect(stored(session)).toBeNull();
  });

  test("remember: false moves it back and leaves nothing on disk", () => {
    const store = open();
    store.update({ apiKey: "sk-live-1", remember: true });
    store.update({ remember: false });

    expect(stored(session).apiKey).toBe("sk-live-1");
    expect(stored(local)).toBeNull();
  });

  test("a remembered record is found again in a brand new tab", () => {
    open().update({ apiKey: "sk-live-1", model: "anthropic/claude-sonnet-5", remember: true });

    const reopened = createSettingsStore(new FakeStorage(), local).get();

    expect(reopened.apiKey).toBe("sk-live-1");
    expect(reopened.model).toBe("anthropic/claude-sonnet-5");
    expect(reopened.remember).toBe(true);
  });

  test("the remembered record wins over a stale tab record", () => {
    session.setItem(WIDGET_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, apiKey: "stale" }));
    local.setItem(WIDGET_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, apiKey: "remembered", remember: true }));

    expect(open().get().apiKey).toBe("remembered");
  });

  test("forget() erases both areas and returns to the defaults", () => {
    const store = open();
    store.update({ apiKey: "sk-live-1", githubToken: "ghp_1", remember: true });

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
    store.update({ apiKey: "sk-1", collector: "https://evil.example" } as never);

    expect((store.get() as unknown as Record<string, unknown>).collector).toBeUndefined();
    expect(stored(session).collector).toBeUndefined();
  });

  test("notifies subscribers and stops after unsubscribe", () => {
    const store = open();
    const seen: string[] = [];
    const off = store.subscribe((settings) => seen.push(settings.provider));

    store.update({ provider: "anthropic" });
    off();
    store.update({ provider: "openai" });

    expect(seen).toEqual(["anthropic"]);
  });

  test("returns the new settings and a new object reference", () => {
    const store = open();
    const before = store.get();
    const after = store.update({ model: "gpt-5" });

    expect(after).not.toBe(before);
    expect(after.model).toBe("gpt-5");
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
