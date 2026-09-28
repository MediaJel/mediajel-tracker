import { cva, type VariantProps } from "class-variance-authority";
import { ComponentProps } from "react";
import { cn } from "~/lib/utils";

/**
 * shadcn's Alert (radix-nova) as the work order's notice: a paper slip on stock with a full 1px
 * rule in the role colour — never a coloured left edge, which is the one mark this panel refuses.
 * Its lines are paragraphs, stacked with a gap; the title, description and action slots of the
 * stock component are not used and not kept.
 */
const alertVariants = cva("grid gap-1.5 rounded-sm border bg-stock px-2.5 py-2 text-sm [&_p]:m-0", {
  variants: {
    tone: {
      identity: "border-primary",
      warn: "border-destructive",
      privacy: "border-privacy",
    },
  },
  defaultVariants: { tone: "identity" },
});

export type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

export const Alert = ({ className, tone, ...props }: AlertProps) => (
  <div data-slot="alert" role="alert" className={cn(alertVariants({ tone }), className)} {...props} />
);
