/**
 * The widget's stylesheet, adopted into its shadow root.
 *
 * Authored as a TS string rather than a `.css` file behind Parcel's `bundle-text:` scheme:
 * that scheme makes the stylesheet its own inlined bundle, which drags the async bundle
 * group's CSS loader into the ALWAYS-LOADED tag — measured at 599 bytes of code that can never
 * run, on every page view of every client site.
 *
 * Two rules for anything added here:
 *  1. The host carries `all: initial` inline, so nothing inside the shadow root inherits a
 *     usable font, colour or box model. Every root element states its own.
 *  2. Tokens live on `:host` and nowhere else. `all` does not reset custom properties, so they
 *     survive the inline reset and are the single source of truth for colour and type.
 */
export const styles = `
:host {
  /* Colour — neutrals and one accent; the other three are roles, not decoration.
     The card never inverts: it is a paper document and stays paper-light over dark pages. */
  --mj-paper: #e6e9eb;
  --mj-card: #ffffff;
  --mj-ink: #14161a;
  --mj-ink-soft: #565c66;
  --mj-ink-faint: #8a9199;
  --mj-rule: #c7cdd3;
  --mj-identity: #1f4fe0;
  --mj-platform: #0b8f6b;
  --mj-partner: #db4a15;
  --mj-privacy: #6c34e8;

  /* Type — system stacks only. A webfont on a client's page is a request we have no right to make. */
  --mj-display: "Futura", "Futura PT", "Century Gothic", "Avenir Next", "Avenir", system-ui, sans-serif;
  --mj-body: "Avenir Next", "Avenir", -apple-system, "Segoe UI", Roboto, sans-serif;
  --mj-mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace;

  --mj-radius: 4px;
  --mj-pad: 12px;
  --mj-row: 36px;
  --mj-shadow: 0 16px 40px rgba(20, 22, 26, 0.28);

  right: 16px;
  bottom: 16px;
}

/* Beats the host's own inline right/bottom, which are there so the widget is still docked and
   contained if this stylesheet never lands. Below 480px the card is a bottom sheet instead. */
@media (max-width: 480px) {
  :host {
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
  }
}

.mj-root,
.mj-root *,
.mj-root *::before,
.mj-root *::after {
  box-sizing: border-box;
}

.mj-root {
  font: 400 13px/1.35 var(--mj-body);
  color: var(--mj-ink);
  text-align: left;
  -webkit-font-smoothing: antialiased;
}

.mj-root button {
  font: inherit;
  color: inherit;
  margin: 0;
}

.mj-root :focus-visible {
  outline: 2px solid var(--mj-identity);
  outline-offset: 2px;
}

/* --- the card ------------------------------------------------------------------------- */

.mj-card {
  display: flex;
  flex-direction: column;
  width: 380px;
  max-height: min(600px, calc(100vh - 32px));
  background: var(--mj-card);
  border: 1px solid var(--mj-rule);
  border-radius: var(--mj-radius);
  box-shadow: var(--mj-shadow);
  overflow: hidden;
}

@media (max-width: 480px) {
  .mj-card {
    width: 100vw;
    max-height: 85vh;
    border-radius: 8px 8px 0 0;
    border-bottom: 0;
  }
}

/* --- header --------------------------------------------------------------------------- */

.mj-header {
  flex: none;
  padding: var(--mj-pad);
}

.mj-letterhead {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mj-mark {
  display: block;
  flex: none;
  width: 20px;
  height: 20px;
}

.mj-wordmark {
  font-family: var(--mj-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mj-letterhead-rule {
  flex: none;
  width: 1px;
  height: 12px;
  background: var(--mj-rule);
}

.mj-doc-title {
  font-size: 13px;
  font-weight: 600;
}

.mj-header-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.mj-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 3px;
  background: none;
  color: var(--mj-ink-soft);
  cursor: pointer;
}

.mj-icon-button:hover {
  background: var(--mj-paper);
  color: var(--mj-ink);
}

/* Definition rows. More space above the block than inside it. */
.mj-defs {
  display: grid;
  grid-template-columns: 44px 1fr;
  column-gap: 12px;
  row-gap: 8px;
  align-items: baseline;
  margin-top: 16px;
}

.mj-def-label {
  font-family: var(--mj-display);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mj-ink-soft);
}

.mj-def-value {
  font-family: var(--mj-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.mj-def-value--job {
  font-family: var(--mj-body);
  font-size: 16px;
  font-weight: 600;
}

.mj-def-value--empty {
  color: var(--mj-ink-faint);
}

/* --- zigzag rule ----------------------------------------------------------------------- */

.mj-zigzag {
  display: block;
  flex: none;
  width: 100%;
  height: 8px;
  color: var(--mj-rule);
}

.mj-zigzag--live {
  color: var(--mj-identity);
}

/* --- section rows ---------------------------------------------------------------------- */

.mj-sections {
  flex: 1 1 auto;
  overflow-y: auto;
}

.mj-section + .mj-section {
  border-top: 1px solid var(--mj-rule);
}

.mj-section-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: var(--mj-row);
  padding: 0 var(--mj-pad);
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.mj-section-row[aria-disabled="true"] {
  cursor: default;
}

.mj-section-number,
.mj-section-label {
  font-family: var(--mj-display);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mj-section-number {
  color: var(--mj-ink-faint);
  font-variant-numeric: tabular-nums;
}

.mj-section-row[data-reached="true"] .mj-section-number {
  color: var(--mj-ink);
}

.mj-section-row[aria-disabled="true"] .mj-section-label {
  color: var(--mj-ink-faint);
}

.mj-section-state {
  margin-left: auto;
  font-family: var(--mj-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--mj-ink-soft);
}

.mj-chevron {
  flex: none;
  color: var(--mj-ink-faint);
  transition: transform 180ms ease-out;
}

.mj-section-row[aria-expanded="true"] .mj-chevron {
  transform: rotate(180deg);
}

/* --- launcher chip ---------------------------------------------------------------------- */

.mj-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  max-width: 160px;
  padding: 0 12px;
  border: 1px solid var(--mj-rule);
  border-radius: var(--mj-radius);
  background: var(--mj-paper);
  box-shadow: var(--mj-shadow);
  cursor: pointer;
  transition: background 200ms ease-out;
}

.mj-chip:hover {
  background: var(--mj-card);
}

.mj-chip-mark {
  display: block;
  flex: none;
  width: 18px;
  height: 18px;
}

.mj-chip-label {
  overflow: hidden;
  font-family: var(--mj-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .mj-root *,
  .mj-root *::before,
  .mj-root *::after {
    transition-duration: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
  }
}
`;

export default styles;
