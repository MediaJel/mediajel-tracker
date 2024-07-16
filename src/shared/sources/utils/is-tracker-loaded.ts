export const isTrackerLoaded = (callback: () => void): void => {
  if (window.tracker) {
    callback();
  } else {
    let trackerLoaded = false;
    const intervalId = setInterval(() => {
      if (window.tracker && !trackerLoaded) {
        trackerLoaded = true;
        clearInterval(intervalId);
        callback();
      }
    }, 100);
  }
};
