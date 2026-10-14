import { Indicator, Root } from "@radix-ui/react-checkbox";
import { ComponentProps } from "react";

import { cn } from "~/lib/utils";
import { Check } from "~/ui/icons";

/**
 * shadcn's Checkbox (radix-nova): a 16px square ruled in the input's hairline, filled with
 * identity ink and the panel's own check when on. The base layer draws its focus ring; the
 * `disabled:` and `aria-invalid:` styles of the stock component are not kept.
 */
export const Checkbox = ({ className, ...props }: ComponentProps<typeof Root>) => (
  <Root
    data-slot="checkbox"
    className={cn(
      "mt-0.5 flex size-4 flex-none cursor-pointer items-center justify-center rounded-sm border border-input bg-sheet text-primary-foreground data-checked:border-primary data-checked:bg-primary",
      className,
    )}
    {...props}
  >
    <Indicator data-slot="checkbox-indicator" className="flex items-center justify-center [&_svg]:size-3">
      <Check />
    </Indicator>
  </Root>
);
