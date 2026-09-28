import { QueryStringContext } from "../types";

/**
 * The tag announces itself on the page.
 *
 * Anything on the page — the Integrations Assistant's content script first of all — can learn which
 * MediaJel tags are here and how far each one got, without inferring it from script URLs or from
 * collector traffic. Two channels carry the same record: `window.MediaJel.tags`, for whoever looks
 * after the fact, and a `mediajel:tag` event on `window`, for whoever is already listening.
 *
 * An announcement is metadata read off the tag's own URL, nothing more. The first one goes out before
 * the privacy gate and does not weaken it: no network, no storage, and the gate itself is unchanged.
 */

export const TAG_EVENT = "mediajel:tag";

/** How far a tag got. A boot ends in exactly one of the three terminal states, or in `running`. */
export type TagState = "installed" | "running" | "opted-out" | "disabled" | "failed";

/** One tag's record: an entry of `window.MediaJel.tags`, and the `detail` of a `mediajel:tag` event. */
export interface TagAnnouncement {
  v: 1;
  appId: string;
  environment: string;
  version: string;
  event: string;
  collector: string;
  /** False only when the tag is switched off, by `enable=false` on its URL or in `window.overrides`. */
  enable: boolean;
  /** The tag script's URL, as read when it was installed; "" when it could not be read. */
  src: string;
  state: TagState;
  error?: string;
  /** When the record was made, as `Date.now()`. */
  at: number;
}

/** What `window.MediaJel` holds: one record per app ID, in the order the tags first spoke. */
export interface MediaJelRegistry {
  v: 1;
  tags: TagAnnouncement[];
  announce(tag: TagAnnouncement): void;
}

// A record only moves forward. A lower-ranked announcement for an app ID already on record is
// ignored, so a tag that is running is never demoted by a late "installed", and whichever way a boot
// ended is the one that stands; an equal or higher rank replaces the record.
const RANK: Record<TagState, number> = { installed: 0, "opted-out": 1, disabled: 1, failed: 1, running: 2 };

const rankOf = (state: TagState): number => RANK[state] ?? 0;

const outranked = (tag: TagAnnouncement, existing: TagAnnouncement | undefined): boolean =>
  existing !== undefined && rankOf(tag.state) < rankOf(existing.state);

// A record is replaced, never changed: every entry is frozen. Only the synchronous "installed"
// announcement can read the script's URL, so a later one without it keeps the URL on record.
// (Object.assign rather than a spread: the spread costs the tag two helper modules.)
const entryOf = (tag: TagAnnouncement, existing: TagAnnouncement | undefined): TagAnnouncement =>
  Object.freeze(Object.assign({}, tag, { src: tag.src || existing?.src || "" }));

const tagEvent = (entry: TagAnnouncement): Event => {
  if (typeof CustomEvent === "function") return new CustomEvent(TAG_EVENT, { detail: entry });
  const event = document.createEvent("CustomEvent");
  event.initCustomEvent(TAG_EVENT, false, false, entry);
  return event;
};

/** Puts `tag` on record and returns the record, or null when a record that outranks it already stands. */
const admit = (tags: TagAnnouncement[], tag: TagAnnouncement): TagAnnouncement | null => {
  const index = tags.findIndex((known) => known.appId === tag.appId);
  const existing: TagAnnouncement | undefined = tags[index];
  if (outranked(tag, existing)) return null;
  const entry = entryOf(tag, existing);
  if (index === -1) tags.push(entry);
  else tags[index] = entry;
  return entry;
};

const createRegistry = (): MediaJelRegistry => {
  const tags: TagAnnouncement[] = [];
  return {
    v: 1,
    tags,
    announce: (tag) => {
      try {
        const entry = admit(tags, tag);
        if (entry) window.dispatchEvent(tagEvent(entry));
      } catch {
        // The page also reaches this through window.MediaJel; whatever it passes, it never throws back.
      }
    },
  };
};

/** Whether `x` is a registry this tag can announce to — this build's, or a later build's with a higher `v`. */
export const isRegistry = (x: unknown): x is MediaJelRegistry => {
  try {
    const candidate = x as Partial<MediaJelRegistry> | null | undefined;
    return typeof candidate?.announce === "function" && typeof candidate?.v === "number";
  } catch {
    return false;
  }
};

// The tag that speaks first sets up `window.MediaJel`, and every tag after it joins that one. A
// `window.MediaJel` that is something else entirely belongs to the page: it is left exactly as it is,
// and this tag keeps its record to itself — the event still goes out, so a listener learns of the
// tag either way.
let own: MediaJelRegistry | undefined;

const registry = (): MediaJelRegistry => {
  if (window.MediaJel === undefined) window.MediaJel = createRegistry();
  if (isRegistry(window.MediaJel)) return window.MediaJel;
  own = own ?? createRegistry();
  return own;
};

const text = (value: string | undefined): string => value ?? "";

const isEnabled = (ctx: QueryStringContext): boolean => String(ctx.enable ?? "") !== "false";

// `document.currentScript` is the tag's own element only while the script runs synchronously, which
// is when the "installed" announcement is made; every later one reads "" and keeps the URL on record.
const currentSrc = (): string => (document.currentScript as HTMLScriptElement | null)?.src ?? "";

const announcementOf = (ctx: QueryStringContext, state: TagState, error: string | undefined): TagAnnouncement => {
  const announcement: TagAnnouncement = {
    v: 1,
    appId: text(ctx.appId),
    environment: text(ctx.environment),
    version: text(ctx.version),
    event: text(ctx.event),
    collector: text(ctx.collector),
    enable: isEnabled(ctx),
    src: currentSrc(),
    state,
    at: Date.now(),
  };
  if (error !== undefined) announcement.error = error;
  return announcement;
};

/**
 * Announces this tag's `state` on the page: on `window.MediaJel.tags`, and as a `mediajel:tag` event.
 * Whatever goes wrong in here stays in here — neither the tag's boot nor the page ever sees it.
 */
export const announceTag = (ctx: QueryStringContext, state: TagState, error?: string): void => {
  try {
    registry().announce(announcementOf(ctx, state, error));
  } catch {
    // Announcing is a courtesy to whoever listens, never the page's problem.
  }
};
