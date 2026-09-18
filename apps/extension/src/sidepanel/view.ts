import { TagRecord, TrackerStatus, nothingKnown, trackerStatus, withDefaults } from "@mediajel/assistant-core/tags";

import type { JobView } from "~/bridge/api";

/**
 * A `job/open` answer as this panel can use it, whichever background answered.
 *
 * The panel and the service worker are two files of one extension, and Chrome does not swap them
 * together: a rebuild on disk gives the next opened panel the new page while the worker keeps
 * running the old code until the extension is reloaded. An older worker answers without `tags`
 * and `settled`, and with no status at all for a page it has not read. That is a page nothing is
 * known about yet — the listening state — not a reason to render nothing. Its tag records, when
 * it has them, predate the collector and the configuration, and are completed here.
 */

const tagsOf = (tags: TagRecord[] | undefined): TagRecord[] => (tags ?? []).map(withDefaults);

const statusOf = (site: string, status: TrackerStatus | undefined): TrackerStatus =>
  status ? { ...status, tags: tagsOf(status.tags) } : trackerStatus(nothingKnown(site));

export const normalizeView = (view: Partial<JobView> & Pick<JobView, "site" | "session">): JobView => ({
  site: view.site,
  session: view.session,
  tags: tagsOf(view.tags),
  settled: view.settled ?? false,
  status: statusOf(view.site, view.status),
});
