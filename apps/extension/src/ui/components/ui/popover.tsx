import { Content, Portal, Root, Trigger } from "@radix-ui/react-popover";
import { ComponentProps } from "react";
import { cn } from "~/lib/utils";

/**
 * shadcn's Popover (radix-nova), for the panel's info disclosures: the answer to "what does this
 * mean?", one click away. A disclosure and not a hover tooltip, because hover excludes keyboards
 * and touch. Radix gives it what the hand-rolled one lacked — Escape, focus return, a portal out
 * of whatever card it sits in — and the panel keeps its own paper: stock, the pressed edge, 11px
 * body text in soft ink. No zoom or fade on open: stamps are the single authored motion.
 */
export const Popover = Root;

export const PopoverTrigger = Trigger;

export const PopoverContent = ({
  className,
  align = "start",
  sideOffset = 6,
  collisionPadding = 20,
  ...props
}: ComponentProps<typeof Content>) => (
  <Portal>
    <Content
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(
        "z-50 w-[calc(100vw-40px)] max-w-80 rounded-sm bg-stock px-3 py-2.5 font-sans text-xs leading-[1.45] font-normal tracking-normal text-muted-foreground normal-case shadow-press outline-hidden",
        className,
      )}
      {...props}
    />
  </Portal>
);
