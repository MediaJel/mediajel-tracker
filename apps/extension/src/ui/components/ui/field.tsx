import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Field (radix-nova), cut down to what a form on the work order needs: a field is its
 * label over its control, and the label is set the way every small heading on the sheet is —
 * the display face in caps, in soft ink. Orientation, groups, separators and the error slot of
 * the stock component are not used and not kept; a failure is a notice under the form.
 */
export const Field = ({ className, ...props }: ComponentProps<"div">) => (
  <div role="group" data-slot="field" className={cn("flex w-full flex-col gap-1", className)} {...props} />
);

export const FieldLabel = ({ className, ...props }: ComponentProps<"label">) => (
  <label
    data-slot="field-label"
    className={cn("font-display text-2xs tracking-label text-muted-foreground uppercase", className)}
    {...props}
  />
);
