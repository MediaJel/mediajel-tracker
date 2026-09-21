import { Item, Root } from "@radix-ui/react-radio-group";
import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's RadioGroup (radix-nova) without the dot: on the sheet an option is the whole card the
 * operator reads, not a circle beside it, so an item is a bare button for the card's text and
 * the card around it takes its look from the item's state (`has-data-checked:`). Radix keeps
 * the roving focus and the arrow keys.
 */
export const RadioGroup = ({ className, ...props }: ComponentProps<typeof Root>) => (
  <Root data-slot="radio-group" className={cn("grid gap-2", className)} {...props} />
);

export const RadioGroupItem = ({ className, ...props }: ComponentProps<typeof Item>) => (
  <Item
    data-slot="radio-group-item"
    className={cn("flex min-w-0 cursor-pointer flex-col gap-[3px] border-0 bg-transparent p-0 text-left", className)}
    {...props}
  />
);
