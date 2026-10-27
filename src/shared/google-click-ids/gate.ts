/**
 * Whether this page runs click-ID persistence. It is part of the entry script, so the runtime (its own chunk) is only
 * downloaded where it will run: never for impression pixels or with clickIds=false; otherwise on a site in the rollout
 * list, in a menu embedded in a page on the list, or anywhere with clickIds=true.
 */
import { QueryStringContext } from "src/shared/types";

import { onAllowedSite } from "./allowed-sites";

export const isFramed = (win: Window): boolean => {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

// The pages embedding this one: Chromium and WebKit list their origins in location.ancestorOrigins; elsewhere the
// embedding page's URL is the frame's referrer.
const embeddingHosts = (win: Window): string[] => {
  try {
    const ancestors = win.location.ancestorOrigins;
    const urls: string[] = ancestors && ancestors.length ? Array.prototype.slice.call(ancestors) : [win.document.referrer];
    return urls.map(hostOf);
  } catch {
    return [];
  }
};

export const clickIdsEnabled = (context: QueryStringContext, win: Window, sites?: string[]): boolean => {
  if (context.event === "impression" || context.clickIds === "false") return false;
  if (context.clickIds === "true") return true;
  const hosts = [win.location.hostname].concat(isFramed(win) ? embeddingHosts(win) : []);
  return hosts.some((host) => onAllowedSite(host, sites));
};
