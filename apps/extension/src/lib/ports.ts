/**
 * Port names, in one place so the panel does not have to import the background service worker
 * to learn one string — which would pull the whole worker into the panel's bundle.
 */

/** The relay content script's port. The tab id is NOT in the name: `port.sender.tab.id` is
 *  authoritative and cannot be spoofed by a page that got at the content script. */
export const RELAY_PORT = "mj-relay";

/** A panel's port, suffixed with the tab it is bound to. */
export const PANEL_PORT = "mj-panel";
