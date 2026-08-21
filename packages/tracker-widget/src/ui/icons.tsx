import markUrl from "data-url:./assets/mj-mark-128.png";
import { VNode } from "@mediajel/tracker-widget/vendor";

/**
 * Every drawn element in the card, in one place and one weight.
 *
 * The line icons are authored here rather than pulled from a library: two glyphs at 1.5px on a
 * 16px grid is less code than a dependency, and it guarantees they share a stroke with the
 * zigzag rule, which is the card's signature.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 1.5,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;

/** Three sliders with knobs — the settings glyph that stays unmistakable at 16px. */
export const Gear = ({ class: className }: { class?: string } = {}): VNode => (
  <svg class={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...STROKE}>
    <path d="M2 4h12M2 8h12M2 12h12" />
    <circle cx="6" cy="4" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="8" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

/** A circular arrow — start the work order over. */
export const Restart = ({ class: className }: { class?: string } = {}): VNode => (
  <svg class={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...STROKE}>
    <path d="M3.2 8a4.8 4.8 0 1 0 1.4-3.4" />
    <path d="M3 2.5v3h3" />
  </svg>
);

/** Points down at rest; `.mj-chevron` rotates it when its section row is expanded. */
export const ChevronDown = ({ class: className }: { class?: string } = {}): VNode => (
  <svg class={className} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...STROKE}>
    <path d="M4 6.25 8 10.25 12 6.25" />
  </svg>
);

/** Teeth across the rule. 48 of them, as in the brand's own zigzag. */
const TEETH = 48;
const ZIGZAG_POINTS = Array.from({ length: TEETH * 2 + 1 }, (_, i) => `${i},${i % 2 === 0 ? 6.5 : 1.5}`).join(" ");

/**
 * The card's divider. Stretched to the card's width with `preserveAspectRatio="none"`, which
 * would smear the stroke horizontally — `vector-effect` is what keeps it a 1.5px line.
 */
export const Zigzag = ({ live = false }: { live?: boolean }): VNode => (
  <svg
    class={`mj-zigzag${live ? " mj-zigzag--live" : ""}`}
    viewBox={`0 0 ${TEETH * 2} 8`}
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <polyline
      points={ZIGZAG_POINTS}
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      vector-effect="non-scaling-stroke"
    />
  </svg>
);

/**
 * The MediaJel mark. The one raster in the card, inlined as a data URI by Parcel so the widget
 * never requests its own artwork from a client's page — and never recoloured.
 */
export const Mark = ({ class: className }: { class: string }): VNode => (
  <img class={className} src={markUrl} alt="" width="20" height="20" />
);
