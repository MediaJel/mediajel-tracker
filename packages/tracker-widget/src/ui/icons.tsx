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

/** Eight spokes around a hub — a gear that stays legible at 16px. */
export const Gear = (): VNode => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...STROKE}>
    <circle cx="8" cy="8" r="2.6" />
    <path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2" />
  </svg>
);

/** Points down at rest; the CSS rotates it when its section opens. */
export const ChevronDown = (): VNode => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...STROKE}>
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
