import { MouseEvent, ReactNode } from "react";

import { Button } from "~/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/ui/components/ui/popover";
import { Info } from "~/ui/icons";

/**
 * An explanation that is there when you want it and gone when you do not.
 *
 * The panel has a lot it could say — what a domain file means versus an app-id file, what a
 * deploy actually does to the repo — and saying all of it at once turns a work order into a
 * manual. This keeps the answer one click away and the surface quiet.
 *
 * A disclosure, not a hover tooltip: hover excludes keyboards and touch, and this is a tool
 * people use all day, where "I could not read the thing that explains the irreversible button"
 * is not an acceptable state. It stays open until dismissed — by its button, by Escape, or by
 * a click elsewhere — and focus comes back to the button.
 */

export interface InfoTipProps {
  /** What the button announces to a screen reader — "What a domain file is", not "More info". */
  label: string;
  children: ReactNode;
}

/** Target cards are buttons themselves; the info button must not choose the target. */
const keepToItself = (event: MouseEvent): void => {
  event.stopPropagation();
};

export const InfoTip = ({ label, children }: InfoTipProps): ReactNode => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        title={label}
        className="hover:bg-transparent hover:text-primary data-open:text-primary"
        onClick={keepToItself}
      >
        <Info />
      </Button>
    </PopoverTrigger>
    <PopoverContent role="note">{children}</PopoverContent>
  </Popover>
);

export default InfoTip;
