/**
 * Storage keys owned by the widget.
 *
 * `WIDGET_ACTIVE_KEY` is the one key the always-loaded tag also touches: the stub in
 * apps/tracker reads it on boot to decide whether to re-import the widget after a
 * navigation. Both sides import it from here so the flag written and the flag polled
 * can never drift apart.
 */
export const WIDGET_ACTIVE_KEY = "mj-widget:active";
