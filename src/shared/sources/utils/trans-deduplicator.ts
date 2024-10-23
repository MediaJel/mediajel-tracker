/*
 *   Saves a key on the session storage to indicate that the tracker has been
 *   loaded once, this will prevent multiple triggering of the code
 *   even without reloading the page. And when the user reloads the page,
 *   the key will be removed and placed again.
 */

import logger from 'src/shared/logger';

export const runOncePerPageLoad = (callback) => {
  const key = "key";

  if (!sessionStorage.getItem(key)) {
    logger.info("First run in this session");
    callback();
    sessionStorage.setItem(key, "loaded");
  } else {
    logger.info("Already run in this session");
  }

   // Listen for the unload event to reset the sessionStorage item
window.addEventListener("beforeunload", () => {
  sessionStorage.removeItem("key");
});

// Listen for page changes to reset the sessionStorage item
window.addEventListener("popstate", () => {
  sessionStorage.removeItem("key");
});

const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function (...args) {
  originalPushState.apply(this, args);
  sessionStorage.removeItem("key");
  window.dispatchEvent(new Event("popstate"));
};

history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  sessionStorage.removeItem("key");
  window.dispatchEvent(new Event("popstate"));
};
};