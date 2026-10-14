import { ReactNode } from "react";

import { ChevronDown } from "~/ui/icons";
import { cn } from "~/lib/utils";

/**
 * The disclosure chevron, in faint ink, turning over when what it opens is open. A sealed slip's
 * row passes `group-aria-expanded:rotate-180` so the turn follows the trigger's own state.
 */
export const Chevron = ({ up = false, className }: { up?: boolean; className?: string }): ReactNode => (
  <ChevronDown
    className={cn(
      "flex-none text-ink-faint transition-transform duration-[220ms] ease-[cubic-bezier(0.2,0.9,0.3,1)]",
      up && "rotate-180",
      className,
    )}
  />
);
