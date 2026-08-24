import isUsPrivacyOptOut from "@mediajel/tracker-core/utils/privacy-opt-out";
import { guard } from "@mediajel/tracker-core/utils/guard";
import { PageContext } from "@mediajel/assistant-core/context";

/**
 * What the operator needs to know about the tag on THIS page before trusting a recording:
 * whether `trackTrans` exists at all, and the three configurations that silently disable it.
 */

export interface TrackerStatus {
  appId: string;
  environment: string;
  version: string;
  /** The tag URL's `event` param. `impression`/`signup` make trackTrans a silent no-op. */
  event: string;
  collector: string;
  /** Whether a MediaJel tag was found on the page at all. */
  tagPresent: boolean;
  trackTransPresent: boolean;
  /** GPC/DNT stopped the tag before it initialised anything. */
  optedOut: boolean;
  /** Human-readable reasons the recording may not translate into working tracking. */
  warnings: string[];
}

export const snapshotTracker = (ctx: PageContext): TrackerStatus => {
  const tag = ctx.tag;
  const event = String(tag.event ?? "");
  const optedOut = isUsPrivacyOptOut();
  const trackTransPresent = typeof window.trackTrans === "function";

  const warnings: string[] = [];
  if (!ctx.tagPresent) {
    warnings.push(
      "No MediaJel tag on this page. You can still record and generate; Verify needs the tag, so load it first.",
    );
  }
  if (optedOut) {
    warnings.push(
      "This browser sends GPC/DNT, so the tracker did not initialise here. Recording and Verify still work.",
    );
  } else if (ctx.tagPresent && !trackTransPresent) {
    warnings.push("window.trackTrans is not on the page (yet) — the tag may still be loading, or it is disabled.");
  }
  if (event === "impression" || event === "signup") {
    warnings.push(`This tag runs with event=${event}, so window.trackTrans is a silent no-op on this page.`);
  }
  if (String(tag.enable ?? "") === "false") warnings.push("This tag is disabled (enable=false).");

  return {
    appId: String(tag.appId ?? ""),
    environment: String(tag.environment ?? ""),
    version: String(tag.version ?? ""),
    event,
    collector: String(tag.collector ?? ""),
    tagPresent: ctx.tagPresent,
    trackTransPresent,
    optedOut,
    warnings,
  };
};

/**
 * The tag assigns `window.trackTrans` late, inside its adapters chunk, so presence is a thing
 * to poll — same cadence as the frictionless helpers (100ms). One shot: calls back once when
 * it appears, or never.
 */
export const watchTrackTrans = (onPresent: () => void): (() => void) => {
  if (typeof window.trackTrans === "function") {
    onPresent();
    return () => undefined;
  }
  const timer = setInterval(
    guard(() => {
      if (typeof window.trackTrans !== "function") return;
      clearInterval(timer);
      onPresent();
    }, "widget-tracktrans-watch"),
    100,
  );
  return () => clearInterval(timer);
};
