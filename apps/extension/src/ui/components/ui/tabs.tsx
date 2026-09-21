import { Content, List, Root, Trigger } from "@radix-ui/react-tabs";
import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Tabs (radix-nova), re-cut as the work order's index tabs.
 *
 * The stock recipe is a pill list on a blurred ground with a focus ring and disabled styles of
 * its own. None of that is kept: the strip sits on stock under the zigzag with a hairline at its
 * foot, the chosen view is printed on the sheet — sheet background, the slips' pressed shadow,
 * standing on the rule with no underline — and the others stay on the ground in soft ink. The
 * base layer draws the focus ring; nothing here is ever disabled. Radix supplies the roving
 * focus, the arrow keys and the tab/panel wiring.
 */
export const Tabs = ({ className, ...props }: ComponentProps<typeof Root>) => (
  <Root data-slot="tabs" className={cn("flex min-h-0 flex-auto flex-col", className)} {...props} />
);

export const TabsList = ({ className, ...props }: ComponentProps<typeof List>) => (
  <List
    data-slot="tabs-list"
    className={cn("flex flex-none items-end gap-px border-b border-border bg-stock px-2", className)}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: ComponentProps<typeof Trigger>) => (
  <Trigger
    data-slot="tabs-trigger"
    className={cn(
      "flex min-h-[34px] min-w-0 flex-auto cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent px-2 font-display text-xs font-semibold tracking-label whitespace-nowrap text-muted-foreground uppercase hover:text-foreground motion-safe:transition-colors motion-safe:duration-150 data-active:rounded-t-sm data-active:bg-sheet data-active:text-foreground data-active:shadow-press",
      className,
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }: ComponentProps<typeof Content>) => (
  <Content
    data-slot="tabs-content"
    // Radix keeps an inactive panel in the DOM under the `hidden` attribute; with no preflight, the
    // display utility would win over it, so the inactive state says display: none itself.
    className={cn("flex min-h-0 flex-auto flex-col outline-hidden data-[state=inactive]:hidden", className)}
    {...props}
  />
);
