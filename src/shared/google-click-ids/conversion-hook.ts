/**
 * How the Google Ads plugin reaches the click-ID runtime right before a conversion. The two load as separate chunks,
 * so they meet on window rather than through a shared module, which Parcel may copy into each chunk.
 */
export const registerConversionHook = (prepare: () => string[]): void => {
  window.mjPrepareGoogleConversion = prepare;
};

/** Called by the Google Ads extension right before it fires a conversion; [] when the runtime isn't running here. */
export const prepareGoogleConversion = (): string[] => {
  try {
    return typeof window.mjPrepareGoogleConversion === "function" ? window.mjPrepareGoogleConversion() : [];
  } catch {
    return [];
  }
};
