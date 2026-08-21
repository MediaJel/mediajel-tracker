/**
 * The widget's stylesheet, injected as text into its shadow root so it can neither leak onto
 * the host page nor be restyled by it.
 *
 * Authored as a TS string rather than a `.css` file behind Parcel's `bundle-text:` scheme: that
 * scheme makes the stylesheet its own (inlined) bundle, which puts the async group's CSS loader
 * into the ALWAYS-LOADED tag — measured at 599 bytes of code that can never run, on every page
 * view of every client site. See packages/tracker-widget/README once written.
 */
export default `
.mj-widget-spike {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  padding: 8px 12px;
  border-radius: 8px;
  background: #101114;
  color: #f4f4f5;
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
`;
