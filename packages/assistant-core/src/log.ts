import { createLogger } from "@mediajel/tracker-core/logger";

/**
 * The widget's logger. Separate label from the tag's own `MJ` so an engineer reading a client's
 * console can tell assistant output from tracker output at a glance, and one import so the
 * label can never drift between modules.
 *
 * It honours the tag's `?logs=false` flag like everything else in tracker-core: the widget is a
 * developer tool, but it runs on a client's production page.
 */
export const logger = createLogger("MJ:Widget");

export default logger;
