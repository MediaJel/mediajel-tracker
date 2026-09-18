import { nothingKnown, trackerStatus } from "@mediajel/assistant-core/tags";

import type { JobView } from "~/bridge/api";

/**
 * A `job/open` answer as this panel can use it, whichever background answered.
 *
 * The panel and the service worker are two files of one extension, and Chrome does not swap them
 * together: a rebuild on disk gives the next opened panel the new page while the worker keeps
 * running the old code until the extension is reloaded. An older worker answers without `tags`
 * and `settled`, and with no status at all for a page it has not read. That is a page nothing is
 * known about yet — the listening state — not a reason to render nothing.
 */
export const normalizeView = (view: Partial<JobView> & Pick<JobView, "site" | "session">): JobView => ({
  site: view.site,
  session: view.session,
  tags: view.tags ?? [],
  settled: view.settled ?? false,
  status: view.status ?? trackerStatus(nothingKnown(view.site)),
});
