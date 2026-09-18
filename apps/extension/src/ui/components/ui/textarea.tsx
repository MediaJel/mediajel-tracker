import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Textarea (radix-nova) on the panel's paper. Everything typed into one here is machine
 * text or notes for the machine — the tag's code, a hint for the model — so it is set in mono,
 * with the same hairline and corner as an Input. Resizable down the page only.
 */
export const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <textarea
    data-slot="textarea"
    className={cn(
      "min-h-[30px] w-full resize-y rounded-sm border border-input bg-sheet px-2 py-[5px] font-mono text-sm text-foreground placeholder:text-ink-faint",
      className,
    )}
    {...props}
  />
);
