import { TagSummary } from "@mediajel/assistant-core/context";
import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";

/**
 * Every MediaJel tag a page reported, from whatever page bridge reported it.
 *
 * A status is written by a content script in the page, and that script can be older than the
 * panel reading it — a tab loaded before an update, or a second copy of the extension posting to
 * the same page. Bridges from before `tags` existed report one `appId` and nothing else, and taking
 * `tags` on trust turned that into `undefined.map`: React unmounted the whole panel and left it
 * blank. An older status still names its one tag; it is read as exactly that.
 */
const reportedTags = (status: TrackerStatus): TagSummary[] => {
  if (Array.isArray(status.tags)) return status.tags;
  if (!status.appId) return [];
  return [{ appId: status.appId, environment: status.environment, version: status.version, delayed: false }];
};

/** A tag two reads of the page both found is one tag, and it has run if either read saw it running. */
const once = (tags: TagSummary[]): TagSummary[] => {
  const byAppId = new Map<string, TagSummary>();
  for (const tag of tags) {
    const seen = byAppId.get(tag.appId);
    byAppId.set(tag.appId, seen ? { ...seen, delayed: seen.delayed && tag.delayed } : tag);
  }
  return [...byAppId.values()];
};

/**
 * Every MediaJel tag known on a page: the ones its page bridge reported, the ones the background read
 * from the page itself, and the ones it has been heard sending events from. A tag heard sending has
 * plainly run, so it is not delayed; one heard but never found in a script has no environment or
 * version to report.
 */
export const tagsOf = (status: TrackerStatus, heard: string[] = [], found: TagSummary[] = []): TagSummary[] => {
  const scripts = once([...reportedTags(status), ...found]);
  const sending = new Set(heard);
  const extra = heard.filter((appId) => !scripts.some((tag) => tag.appId === appId));
  return [
    ...scripts.map((tag) => (sending.has(tag.appId) ? { ...tag, delayed: false } : tag)),
    ...extra.map((appId) => ({ appId, environment: "", version: "", delayed: false })),
  ];
};
