import { guard } from "src/shared/utils/guard";

export const isTrackerLoaded = (callback: () => void): void => {
  const safeCallback = guard(callback, "tracker-loaded");
  if (typeof window.tracker === "function") {
    safeCallback();
  } else {
    let trackerLoaded = false;
    const intervalId = setInterval(() => {
      if (typeof window.tracker === "function" && !trackerLoaded) {
        trackerLoaded = true;
        clearInterval(intervalId);
        safeCallback();
      }
    }, 100);
  }
};
