import { cva, type VariantProps } from "class-variance-authority";
import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Badge (radix-nova) in the two shapes the sheet uses: a `pill` that numbers a capture,
 * and a `chip` that names a state in caps ("replayed"). Both sit on stock in the display face;
 * neither is a button, and neither carries the coloured variants of the stock component —
 * a badge here is never a signal, only a label.
 */
const badgeVariants = cva(
  "inline-flex flex-none items-center justify-center rounded-full bg-stock font-display text-muted-foreground",
  {
    variants: {
      variant: {
        pill: "min-w-[30px] px-1 text-3xs leading-[14px]",
        chip: "border border-border px-2 py-0.5 text-2xs tracking-[0.06em] uppercase",
      },
    },
    defaultVariants: { variant: "pill" },
  },
);

export const Badge = ({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) => (
  <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
);
