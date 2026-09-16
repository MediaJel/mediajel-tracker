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
const foundTags = (status: TrackerStatus): TagSummary[] => {
  if (Array.isArray(status.tags)) return status.tags;
  if (!status.appId) return [];
  return [{ appId: status.appId, environment: status.environment, version: status.version, delayed: false }];
};

/**
 * Every MediaJel tag known on a page: the ones its page bridge found, and the ones it has been heard
 * sending events from. A tag heard sending has plainly run, so it is not delayed; one heard but
 * never found in a script has no environment or version to report.
 */
export const tagsOf = (status: TrackerStatus, heard: string[] = []): TagSummary[] => {
  const found = foundTags(status);
  const sending = new Set(heard);
  const extra = heard.filter((appId) => !found.some((tag) => tag.appId === appId));
  return [
    ...found.map((tag) => (sending.has(tag.appId) ? { ...tag, delayed: false } : tag)),
    ...extra.map((appId) => ({ appId, environment: "", version: "", delayed: false })),
  ];
};
