/**
 * Detects US privacy opt-out signals at the browser level.
 *
 * Honors Global Privacy Control (GPC) — the opt-out signal legally recognized
 * under California's CCPA/CPRA and in Colorado and Connecticut — plus legacy
 * Do Not Track (DNT) as a fallback. Read directly from the browser; no consent
 * banner, cookie, or per-site integration is involved.
 *
 * @returns true if the visitor has signaled a privacy opt-out.
 */
const isDntEnabled = (value: string | null | undefined): boolean => value === "1" || value === "yes";

export const isUsPrivacyOptOut = (): boolean => {
  const gpcOptOut = navigator.globalPrivacyControl === true;

  // Check each DNT source independently — a truthy-but-not-opt-out value from one
  // source (e.g. "0") must not mask an opt-out signal from another.
  const dntOptOut =
    isDntEnabled(navigator.doNotTrack) ||
    isDntEnabled(navigator.msDoNotTrack) ||
    isDntEnabled(window.doNotTrack);

  return gpcOptOut || dntOptOut;
};

export default isUsPrivacyOptOut;
