import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Input (radix-nova) on the panel's paper: a hairline rule around the sheet's colour on a
 * 3px corner, body text at 12px, the base layer's identity ring for focus. `disabled:` and
 * `aria-invalid:` styles are left out: the panel never disables a field, and a failure is said in
 * a notice under the form rather than painted on the field.
 */
export const Input = ({ className, type, ...props }: ComponentProps<"input">) => (
  <input
    type={type}
    data-slot="input"
    className={cn(
      "min-h-[30px] w-full min-w-0 rounded-sm border border-input bg-sheet px-2 py-[5px] text-sm text-foreground placeholder:text-muted-foreground",
      className,
    )}
    {...props}
  />
);
