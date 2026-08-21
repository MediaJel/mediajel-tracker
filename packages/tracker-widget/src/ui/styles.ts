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

/* Definition rows. More space above the block than inside it. The explicit margins also clear
   the UA's dl/dd defaults (margin-block 1em, dd margin-inline-start 40px), which apply inside
   shadow roots — the host's all:initial cannot reach descendants. */
.mj-defs {
  display: grid;
  grid-template-columns: 44px 1fr;
  column-gap: 12px;
  row-gap: 8px;
  align-items: baseline;
  margin: 16px 0 0;
}

.mj-def-label {
  font-family: var(--mj-display);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mj-ink-soft);
}

.mj-def-value {
  margin: 0;
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

/* An <ol> for semantics; the UA's decimal markers, 40px indent and block margins would sit
   beside the authored 01–05, so all three are reset here. */
.mj-sections {
  flex: 1 1 auto;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mj-section {
  list-style: none;
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

/* --- section bodies ---------------------------------------------------------------------- */

.mj-section-body {
  padding: 4px var(--mj-pad) var(--mj-pad);
}

.mj-lede {
  margin: 0 0 12px;
  color: var(--mj-ink-soft);
}

.mj-notice {
  margin: 0 0 12px;
  padding: 8px 10px;
  border-left: 3px solid var(--mj-identity);
  background: var(--mj-paper);
  font-size: 12px;
}

.mj-notice p {
  margin: 0;
}

.mj-notice p + p {
  margin-top: 6px;
}

.mj-notice--warn {
  border-left-color: var(--mj-partner);
}

.mj-notice--privacy {
  border-left-color: var(--mj-privacy);
}

.mj-goals {
  display: grid;
  gap: 8px;
}

.mj-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid var(--mj-ink);
  border-radius: 3px;
  background: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.mj-btn--primary {
  border-color: var(--mj-identity);
  background: var(--mj-identity);
  color: #fff;
}

.mj-btn--primary:hover {
  background: #1a45c4;
}

.mj-btn--ghost {
  border-color: var(--mj-rule);
  color: var(--mj-ink-soft);
}

.mj-btn--ghost:hover {
  border-color: var(--mj-ink-soft);
  color: var(--mj-ink);
}

.mj-btn--danger {
  border-color: var(--mj-partner);
  color: var(--mj-partner);
}

.mj-section-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
}

.mj-section-footer > .mj-btn:only-child {
  margin-left: auto;
}

/* --- recording --------------------------------------------------------------------------- */

.mj-rec-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
}

.mj-rec-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mj-identity);
  animation: mj-pulse 1.2s ease-out infinite;
}

@keyframes mj-pulse {
  0% { box-shadow: 0 0 0 0 rgba(31, 79, 224, 0.45); }
  100% { box-shadow: 0 0 0 8px rgba(31, 79, 224, 0); }
}

.mj-rec-label {
  font-family: var(--mj-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--mj-identity);
}

.mj-rec-meta {
  font-family: var(--mj-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--mj-ink-soft);
}

.mj-counts {
  display: grid;
  grid-template-columns: repeat(2, auto 1fr);
  gap: 4px 10px;
  margin: 0 0 4px;
  font-family: var(--mj-mono);
  font-size: 11px;
}

.mj-counts dt {
  color: var(--mj-ink-soft);
}

.mj-counts dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

/* --- stamps ------------------------------------------------------------------------------- */

.mj-stamp {
  display: inline-block;
  padding: 1px 6px;
  border: 2px solid var(--mj-identity);
  border-radius: 3px;
  color: var(--mj-identity);
  font-family: var(--mj-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transform: rotate(-4deg);
  mix-blend-mode: multiply;
  animation: mj-stamp-land 240ms ease-out;
}

.mj-stamp--platform {
  border-color: var(--mj-platform);
  color: var(--mj-platform);
}

.mj-stamp--partner {
  border-color: var(--mj-partner);
  color: var(--mj-partner);
}

.mj-stamp--filled {
  background: var(--mj-platform);
  border-color: var(--mj-platform);
  color: #fff;
  mix-blend-mode: normal;
}

@keyframes mj-stamp-land {
  0% { transform: rotate(-8deg) scale(1.12); opacity: 0.4; }
  100% { transform: rotate(-4deg) scale(1); opacity: 1; }
}


/* --- evidence ---------------------------------------------------------------------------- */

.mj-exhibits,
.mj-ev-list {
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}

.mj-exhibits {
  border: 1px solid var(--mj-identity);
  border-radius: 3px;
}

.mj-ev {
  border-top: 1px solid var(--mj-rule);
}

.mj-ev:first-child {
  border-top: 0;
}

.mj-ev--marked {
  border-left: 3px solid var(--mj-identity);
  background: rgba(31, 79, 224, 0.04);
}

.mj-ev-row {
  display: flex;
  align-items: stretch;
}

.mj-ev-main {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 28px;
  padding: 2px 6px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.mj-ev-badge {
  flex: none;
  min-width: 30px;
  padding: 0 3px;
  border: 1px solid var(--mj-rule);
  border-radius: 2px;
  font-family: var(--mj-mono);
  font-size: 9px;
  line-height: 14px;
  text-align: center;
  color: var(--mj-ink-soft);
}

.mj-ev-time {
  flex: none;
  font-family: var(--mj-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: var(--mj-ink-soft);
}

.mj-ev-summary {
  overflow: hidden;
  flex: 1 1 auto;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mj-ev-signal {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mj-identity);
}

.mj-ev-pin {
  flex: none;
  padding: 0 8px;
  border: 0;
  border-left: 1px solid var(--mj-rule);
  background: none;
  font-family: var(--mj-display);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mj-ink-soft);
  cursor: pointer;
}

.mj-ev-pin[aria-pressed="true"] {
  color: var(--mj-identity);
}

.mj-ev-detail {
  margin: 0;
  padding: 8px 10px;
  border-top: 1px dashed var(--mj-rule);
  background: var(--mj-paper);
  max-height: 220px;
  overflow: auto;
  font-family: var(--mj-mono);
  font-size: 10px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.mj-ev-empty {
  padding: 10px;
  font-size: 12px;
  color: var(--mj-ink-soft);
}

.mj-ev-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0 0 8px;
}

.mj-chip-filter {
  padding: 2px 8px;
  border: 1px solid var(--mj-rule);
  border-radius: 999px;
  background: var(--mj-paper);
  font-family: var(--mj-display);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mj-ink-soft);
  cursor: pointer;
}

.mj-chip-filter--on {
  border-color: var(--mj-identity);
  color: var(--mj-identity);
}

.mj-ev-order {
  margin-left: auto;
}

.mj-ev-list {
  max-height: 190px;
  overflow-y: auto;
  border: 1px solid var(--mj-rule);
  border-radius: 3px;
}

.mj-blocked-note {
  margin: 6px 0 0;
  font-size: 11px;
  text-align: right;
  color: var(--mj-partner);
}

/* --- forms / settings ---------------------------------------------------------------------- */

.mj-field {
  display: block;
  margin: 0 0 10px;
}

.mj-field-label {
  display: block;
  margin: 0 0 4px;
  font-family: var(--mj-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mj-ink-soft);
}

.mj-input,
.mj-textarea {
  width: 100%;
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid var(--mj-rule);
  border-radius: 3px;
  background: var(--mj-card);
  color: var(--mj-ink);
  font: inherit;
  font-size: 12px;
}

.mj-input--mono,
.mj-textarea {
  font-family: var(--mj-mono);
}

.mj-textarea {
  resize: vertical;
}

.mj-secret {
  display: flex;
  gap: 4px;
}

.mj-reveal {
  flex: none;
  padding: 0 8px;
  border: 1px solid var(--mj-rule);
  border-radius: 3px;
  background: var(--mj-paper);
  font-size: 10px;
  color: var(--mj-ink-soft);
  cursor: pointer;
}

.mj-check {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0 0 10px;
  font-size: 12px;
  cursor: pointer;
}

.mj-check input {
  margin: 2px 0 0;
  accent-color: var(--mj-identity);
}

.mj-fieldset {
  margin: 0 0 14px;
  padding: 10px;
  border: 1px solid var(--mj-rule);
  border-radius: 3px;
}

.mj-fieldset > legend {
  padding: 0 4px;
}

.mj-provider-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 0 0 10px;
}

.mj-provider {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  border: 1px solid var(--mj-rule);
  border-radius: 3px;
  background: var(--mj-card);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.mj-provider small {
  font-size: 10px;
  font-weight: 400;
  color: var(--mj-ink-soft);
}

.mj-provider--on {
  border-color: var(--mj-identity);
  box-shadow: inset 0 0 0 1px var(--mj-identity);
}

.mj-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mj-fine {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--mj-ink-soft);
}

.mj-settings-title {
  margin: 0 0 10px;
  font-family: var(--mj-display);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mj-settings-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 4px 0;
}

.mj-settings {
  overflow-y: auto;
}

/* --- generating placeholder ----------------------------------------------------------------- */

.mj-working {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-family: var(--mj-mono);
  font-size: 12px;
  color: var(--mj-ink-soft);
}

@keyframes mj-working-dots {
  0% { content: "·"; }
}


/* --- code & coverage ---------------------------------------------------------------------- */

.mj-code {
  min-height: 180px;
  font-size: 11px;
  line-height: 1.5;
  background: var(--mj-paper);
  white-space: pre;
  overflow-x: auto;
}

.mj-copy {
  float: right;
  padding: 0 6px;
  border: 1px solid var(--mj-rule);
  border-radius: 3px;
  background: var(--mj-card);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--mj-ink-soft);
  cursor: pointer;
}

.mj-cov-line {
  margin: 0 0 6px;
  font-family: var(--mj-mono);
  font-size: 11px;
  color: var(--mj-ink-soft);
}

.mj-coverage {
  margin: 0 0 12px;
  border: 1px solid var(--mj-rule);
  border-radius: 3px;
}

.mj-cov {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 3px 8px;
  font-size: 11px;
}

.mj-cov + .mj-cov {
  border-top: 1px solid var(--mj-rule);
}

.mj-cov dt {
  flex: none;
  width: 96px;
  font-family: var(--mj-mono);
}

.mj-cov dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.mj-cov-status {
  font-family: var(--mj-display);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mj-cov--mapped .mj-cov-status,
.mj-cov--derived .mj-cov-status {
  color: var(--mj-platform);
}

.mj-cov--default .mj-cov-status {
  color: var(--mj-ink-soft);
}

.mj-cov--missing .mj-cov-status {
  color: var(--mj-partner);
}

.mj-cov-src {
  color: var(--mj-ink-soft);
}

.mj-cov em {
  font-family: var(--mj-mono);
  font-style: normal;
  color: var(--mj-ink-soft);
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
