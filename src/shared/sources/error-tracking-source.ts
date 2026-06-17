export const errorTrackingSource = (callback: () => void) => {
  try {
    callback();
  } catch (error) {
    window.tracker("trackError", {
      message: error instanceof Error ? error.message : String(error),
      error: error,
    });
  }
};
