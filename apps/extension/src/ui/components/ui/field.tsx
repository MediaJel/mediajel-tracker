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

/** A ruled group of fields — Settings' Account, Appearance, This page, This browser. */
export const FieldSet = ({ className, ...props }: ComponentProps<"fieldset">) => (
  <fieldset
    data-slot="field-set"
    className={cn("m-0 mb-3.5 min-w-0 rounded-sm border border-border p-2.5", className)}
    {...props}
  />
);

export const FieldLegend = ({ className, ...props }: ComponentProps<"legend">) => (
  <legend
    data-slot="field-legend"
    className={cn("mb-1 px-1 font-display text-2xs tracking-label text-muted-foreground uppercase", className)}
    {...props}
  />
);
