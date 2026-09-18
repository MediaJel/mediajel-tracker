import { AnnouncedTag } from "@mediajel/assistant-core/tags";
import { TAG_EVENT, TagAnnouncement, isRegistry } from "@mediajel/tracker-core/utils/announce";

/**
 * The tag's own word about itself, from the page.
 *
 * A tag built with tracker-core's `announce` puts one record per app ID on `window.MediaJel.tags`
 * and dispatches a `mediajel:tag` event for each. This listens for the events first — so nothing
 * announced between the two steps is missed — and then replays whatever was on record before the
 * bridge arrived. On the production tag of today, which announces nothing, it never fires; the
 * queue, the script copy and the beacons carry detection until the announcing build ships.
 *
 * A `window.MediaJel` that is not a registry belongs to the page and is left alone; the tag still
 * dispatches its events past it, so those are heard either way.
 */

/** Only what the record keeps: the tag's own error text is passed along, its timestamps are not. */
const announced = (tag: TagAnnouncement): AnnouncedTag => ({
  appId: tag.appId,
  environment: tag.environment,
  version: tag.version,
  event: tag.event,
  state: tag.state,
  error: tag.error,
});

const isAnnouncement = (detail: unknown): detail is TagAnnouncement =>
  typeof detail === "object" && detail !== null && typeof (detail as TagAnnouncement).appId === "string";

/** Starts listening; returns the function that stops. */
export const listenForAnnouncements = (win: Window, onTag: (tag: AnnouncedTag) => void): (() => void) => {
  const onEvent = (event: Event): void => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (isAnnouncement(detail)) onTag(announced(detail));
  };
  win.addEventListener(TAG_EVENT, onEvent);
  if (isRegistry(win.MediaJel)) win.MediaJel.tags.forEach((tag) => onTag(announced(tag)));
  return () => win.removeEventListener(TAG_EVENT, onEvent);
};
