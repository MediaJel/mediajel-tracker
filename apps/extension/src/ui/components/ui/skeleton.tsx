import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Skeleton (radix-nova) as the sheet settling: not a grey pulse but carbon stock with a
 * lighter wash passing across it, the way paper looks before the ink lands. Decorative and hidden
 * from assistive technology — the container says it is busy, once. Reduced motion holds the stock
 * still and plain.
 */
export const Skeleton = ({ className, ...props }: ComponentProps<"span">) => (
  <span
    data-slot="skeleton"
    aria-hidden="true"
    className={cn(
      "block rounded-sm bg-[linear-gradient(90deg,var(--mj-carbon)_0%,color-mix(in_srgb,var(--mj-carbon)_55%,var(--mj-sheet))_50%,var(--mj-carbon)_100%)] bg-[length:220%_100%] motion-safe:animate-settling motion-reduce:bg-carbon motion-reduce:bg-none",
      className,
    )}
    {...props}
  />
);
