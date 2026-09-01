import { ReactNode } from "react";

/**
 * The rubber stamp — the work order's signature move. Outline in its role colour, tilted 4°,
 * landed with a one-shot settle animation. `deployed` is the only filled one.
 */
export type StampTone = "identity" | "platform" | "partner";

export const Stamp = ({
  label,
  tone = "identity",
  filled = false,
}: {
  label: string;
  tone?: StampTone;
  filled?: boolean;
}): ReactNode => (
  <span
    className={`mj-stamp mj-stamp--${tone}${filled ? " mj-stamp--filled" : ""}`}
    role="img"
    aria-label={`${label} stamp`}
  >
    {label}
  </span>
);

export default Stamp;
