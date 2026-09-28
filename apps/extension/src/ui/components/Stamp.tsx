import { cva, type VariantProps } from "class-variance-authority";
import { ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * The rubber stamp — the work order's signature move. Outline in its role colour, tilted 4°,
 * landed with a one-shot settle animation; `deployed` is the only filled one. Not a Badge: a
 * badge is set type, and this is ink pressed into paper, which is why it multiplies into the
 * sheet (and, through the token, stops doing so over the dark ground).
 */
const stampVariants = cva(
  "inline-block -rotate-4 rounded-sm border-2 px-1.5 py-px font-display text-2xs font-bold tracking-stamp uppercase motion-safe:animate-stamp-land",
  {
    variants: {
      tone: {
        identity: "border-primary text-primary",
        platform: "border-platform text-platform",
        partner: "border-destructive text-destructive",
        /** A stamp for something set aside — paused — in soft ink, still legible, never alarming. */
        soft: "border-muted-foreground text-muted-foreground",
      },
      filled: {
        true: "border-stamp-fill bg-stamp-fill text-on-ink",
        false: "[mix-blend-mode:var(--mj-stamp-blend)]",
      },
    },
    defaultVariants: { tone: "identity", filled: false },
  },
);

export const Stamp = ({
  label,
  tone = "identity",
  filled = false,
}: {
  label: string;
  tone?: NonNullable<VariantProps<typeof stampVariants>["tone"]>;
  filled?: boolean;
}): ReactNode => (
  <span className={cn(stampVariants({ tone, filled }))} role="img" aria-label={`${label} stamp`}>
    {label}
  </span>
);

export default Stamp;
