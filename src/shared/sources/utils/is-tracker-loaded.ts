export const isTrackerLoaded = (callback: () => void): void => {
  if (typeof window.tracker === "function") {
    callback();
  } else {
    let trackerLoaded = false;
    const intervalId = setInterval(() => {
      if (typeof window.tracker === "function" && !trackerLoaded) {
        trackerLoaded = true;
        clearInterval(intervalId);
        callback();
      }
    }, 100);
  }
};
