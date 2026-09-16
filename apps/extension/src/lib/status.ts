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
export const tagsOf = (status: TrackerStatus): TagSummary[] => {
  if (Array.isArray(status.tags)) return status.tags;
  if (!status.appId) return [];
  return [{ appId: status.appId, environment: status.environment, version: status.version, delayed: false }];
};
