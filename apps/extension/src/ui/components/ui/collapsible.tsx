import { CollapsibleContent, CollapsibleTrigger, Root } from "@radix-ui/react-collapsible";

/**
 * shadcn's Collapsible (radix-nova), unchanged in shape: a sealed slip in the carbon stack is one
 * — its row is the trigger, its record the content. Radix keeps `aria-expanded` and the
 * `data-state` the chevron turns on; the panel keeps the paper.
 */
export const Collapsible = Root;

export { CollapsibleContent, CollapsibleTrigger };
