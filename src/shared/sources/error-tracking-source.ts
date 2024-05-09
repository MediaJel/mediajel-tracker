export const errorTrackingSource = (callback: () => void) => {
  try {
    callback();
  } catch (error) {
    // window.tracker("trackError", {
      message: error?.message,
      error: error,
    });
  }
};
