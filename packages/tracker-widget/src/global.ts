import { TrackerWidgetDisableOptions, TrackerWidgetPrefill } from "@mediajel/tracker-widget/api";

export {};

/**
 * The widget's public surface on `window`. It lives here rather than in tracker-core's
 * interface.ts so the augmentation ships with the package that implements it; consumers
 * pull this file into their compilation via tsconfig `include` (ambient globals only
 * apply to compilations that include the declaring file).
 */
declare global {
  interface Window {
    /** Mount the Integrations Assistant. Safe to call repeatedly — the import is memoized. */
    enableTrackerWidget(prefill?: TrackerWidgetPrefill): Promise<void>;
    /** Unmount it. No-op when it was never enabled. */
    disableTrackerWidget(opts?: TrackerWidgetDisableOptions): Promise<void>;
  }
}
