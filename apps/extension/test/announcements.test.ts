import { describe, expect, test } from "bun:test";

import { AnnouncedTag } from "@mediajel/assistant-core/tags";
import { TAG_EVENT, TagAnnouncement } from "@mediajel/tracker-core/utils/announce";

import { listenForAnnouncements } from "~/bridge/announcements";

/**
 * The tag's own word, heard from the page: whatever was on record before the bridge arrived, then
 * every announcement after it — and nothing from a `window.MediaJel` that is not the tag's.
 */

const announcement = (appId: string, state: TagAnnouncement["state"] = "installed"): TagAnnouncement => ({
  v: 1,
  appId,
  environment: "production",
  version: "2",
  event: "",
  collector: "collector.example",
  enable: true,
  src: `https://tags.cnna.io/?appId=${appId}`,
  state,
  at: 1,
});

/** A window with its own `MediaJel`, kept off the shared happy-dom window so one test cannot leak into the next. */
const windowWith = (mediaJel: unknown): Window => {
  const target = new EventTarget();
  return Object.assign(target, { MediaJel: mediaJel }) as unknown as Window;
};

const registry = (...tags: TagAnnouncement[]) => ({ v: 1, tags, announce: () => undefined });

describe("listening for the tag's announcements", () => {
  test("replays what was on record before the bridge arrived, in order, keeping only what the record needs", () => {
    const heard: AnnouncedTag[] = [];
    const win = windowWith(registry(announcement("first", "running"), announcement("second")));
    listenForAnnouncements(win, (tag) => heard.push(tag));
    expect(heard).toEqual([
      { appId: "first", environment: "production", version: "2", event: "", state: "running", error: undefined },
      { appId: "second", environment: "production", version: "2", event: "", state: "installed", error: undefined },
    ]);
  });

  test("hears every announcement after it, until it is stopped", () => {
    const heard: AnnouncedTag[] = [];
    const win = windowWith(undefined);
    const stop = listenForAnnouncements(win, (tag) => heard.push(tag));
    win.dispatchEvent(new CustomEvent(TAG_EVENT, { detail: { ...announcement("late", "failed"), error: "boom" } }));
    expect(heard.map((tag) => [tag.appId, tag.state, tag.error])).toEqual([["late", "failed", "boom"]]);
    stop();
    win.dispatchEvent(new CustomEvent(TAG_EVENT, { detail: announcement("after") }));
    expect(heard).toHaveLength(1);
  });

  test("a page's own window.MediaJel is not a registry and is left alone; an event without a tag is not a tag", () => {
    const heard: AnnouncedTag[] = [];
    const win = windowWith({ theirs: true, tags: [announcement("not-ours")] });
    listenForAnnouncements(win, (tag) => heard.push(tag));
    win.dispatchEvent(new CustomEvent(TAG_EVENT, { detail: "nonsense" }));
    expect(heard).toEqual([]);
  });
});
