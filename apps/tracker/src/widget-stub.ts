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
 * Shared prefix so the three failure paths cost one string in the always-loaded tag rather than
 * three. Every byte in this file is paid by every page view on every client site.
 */
const FAILED = "Integrations Assistant failed:";

/**
 * Names the cause once in the console, then rethrows so a caller that does handle the promise
 * still sees the failure.
 *
 * Without it, a chunk that never arrives — a 404 from a half-finished CDN deploy, a CSP that
 * blocks the script, an offline laptop — reaches the page only as the browser's own opaque
 * "Failed to fetch dynamically imported module", with nothing tying it to the assistant.
 * Swallowing instead of rethrowing would be worse: `await enableTrackerWidget()` would appear
 * to succeed and the operator would be left staring at a page with no widget on it.
 */
const report = (err: unknown): never => {
  logger.error(FAILED, err);
  throw err;
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
      load(context)
        .then((widget) => widget.enable(prefill))
        .catch(report);

    window.disableTrackerWidget = (opts?: TrackerWidgetDisableOptions): Promise<void> =>
      load(context)
        .then((widget) => widget.disable(opts))
        .catch(report);

    // Auto-resume across navigations, but only in a tab where someone explicitly enabled the
    // widget. sessionStorage can throw outright (sandboxed iframes, blocked storage), hence the
    // try/catch around the whole install.
    //
    // This path swallows rather than rethrowing: nobody called it, so there is no caller to
    // inform, and an unhandled rejection on a client's page is exactly what must not happen.
    if (sessionStorage.getItem(WIDGET_ACTIVE_KEY)) {
      load(context)
        .then((widget) => widget.resume())
        .catch((err) => logger.error(FAILED, "on resume,", err));
    }
  } catch (err) {
    logger.error(FAILED, "on install,", err);
  }
};
