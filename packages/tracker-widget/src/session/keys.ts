/**
 * Storage keys owned by the widget. Every key is namespaced `mj-widget:` so a client's own
 * code can find (and clear) all of it at a glance, and so nothing we write can collide with
 * the tracker's own `${appId}_transaction`-style dedup keys.
 */

/**
 * "Someone enabled the widget in this tab" — sessionStorage, so it dies with the tab and never
 * follows an engineer onto a colleague's session.
 *
 * This is the one key the always-loaded tag also touches: the stub in apps/tracker reads it on
 * boot to decide whether to re-import the widget after a navigation. It hardcodes the literal
 * rather than importing this constant (that import would cost the tag ~228 bytes on every page
 * view of every client site); apps/tracker/src/widget-stub.ts carries a comment pointing here.
 */
export const WIDGET_ACTIVE_KEY = "mj-widget:active";

/** The recorded session — sessionStorage, always. Evidence is per-tab and never persisted. */
export const WIDGET_SESSION_KEY = "mj-widget:session";

/**
 * Provider, model, API key, GitHub token and actor. sessionStorage by default; "Remember on
 * this device" moves the SAME key into localStorage (see session/settings), which is why both
 * areas have to be read on boot.
 */
export const WIDGET_SETTINGS_KEY = "mj-widget:settings";
