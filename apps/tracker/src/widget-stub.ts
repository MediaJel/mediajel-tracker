import logger from "@mediajel/tracker-core/logger";
import { QueryStringContext } from "@mediajel/tracker-core/types";
import { TrackerWidget, TrackerWidgetDisableOptions, TrackerWidgetPrefill } from "@mediajel/tracker-widget/api";

/**
 * The only part of the Integrations Assistant that ships in the always-loaded tag.
 *
 * It defines `window.enableTrackerWidget` / `window.disableTrackerWidget` and nothing else: the
 * widget itself (AI SDK, preact, zod, the recorder) sits behind a dynamic import, so a visitor who
 * never enables it downloads none of it. Keep this file boring and tiny — every byte here is paid
 * by every page view on every client site. The three imports above are all type-only or already in
 * the bundle, so this module adds no static dependency on the widget package.
 */

/**
 * sessionStorage flag meaning "someone enabled the widget in this tab". Deliberately a literal:
 * importing the constant from the widget package would pull one of its modules into the
 * always-loaded bundle for the sake of 16 characters. The owning definition — and the rest of the
 * widget's storage keys — live in packages/tracker-widget/src/session/keys.ts; keep them in step.
 */
const WIDGET_ACTIVE_KEY = "mj-widget:active";

/** Memoized so repeated calls share one chunk download and one widget instance per page. */
let loading: Promise<TrackerWidget> | null = null;

const load = (context: QueryStringContext): Promise<TrackerWidget> => {
  // Package-specifier form (never a relative path): it has to resolve to the same module id the
  // widget package uses internally, or the import() resolves to undefined at runtime.
  if (!loading) {
    loading = import("@mediajel/tracker-widget/widget").then(({ createWidget }) => createWidget(context));
  }
  return loading;
};

/**
 * Installs the widget's public API on `window`.
 *
 * Called before the US-privacy gate on purpose: defining two functions tracks nothing, and an
 * engineer debugging a site that opted out still needs the assistant to load and explain why the
 * tracker is absent.
 *
 * @param context the tag's parsed query string — read here because it comes from
 *                `document.currentScript`, which is only readable while the tag is executing.
 */
export const installWidgetStub = (context: QueryStringContext): void => {
  try {
    window.enableTrackerWidget = (prefill?: TrackerWidgetPrefill): Promise<void> =>
      load(context).then((widget) => widget.enable(prefill));

    window.disableTrackerWidget = (opts?: TrackerWidgetDisableOptions): Promise<void> =>
      load(context).then((widget) => widget.disable(opts));

    // Auto-resume across navigations, but only in a tab where someone explicitly enabled the
    // widget. sessionStorage can throw outright (sandboxed iframes, blocked storage), hence the
    // try/catch around the whole install.
    if (sessionStorage.getItem(WIDGET_ACTIVE_KEY)) {
      load(context)
        .then((widget) => widget.resume())
        .catch((err) => logger.error("Integrations Assistant failed to resume:", err));
    }
  } catch (err) {
    logger.error("Integrations Assistant stub failed to install:", err);
  }
};
