import { Item, Root } from "@radix-ui/react-toggle-group";
import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's ToggleGroup (radix-nova) as the theme choice: a track on stock with the chosen option
 * lifted onto the sheet, in the display face. A single-choice group is a radio group to
 * assistive technology, with the arrow keys Radix gives it; the spacing and orientation
 * variants of the stock component are not kept.
 */
export const ToggleGroup = ({ className, ...props }: ComponentProps<typeof Root>) => (
  <Root data-slot="toggle-group" className={cn("flex rounded-full bg-stock p-[3px]", className)} {...props} />
);

export const ToggleGroupItem = ({ className, ...props }: ComponentProps<typeof Item>) => (
  <Item
    data-slot="toggle-group-item"
    className={cn(
      "min-h-[30px] flex-1 cursor-pointer rounded-full border-0 bg-transparent px-3 font-display text-sm text-muted-foreground transition-colors duration-150 ease-out data-on:bg-sheet data-on:text-foreground data-on:shadow-choice",
      className,
    )}
    {...props}
  />
);
