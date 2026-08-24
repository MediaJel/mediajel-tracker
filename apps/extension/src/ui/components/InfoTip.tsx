import { ReactNode, useState } from "react";

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
 * is not an acceptable state. It stays open until dismissed.
 */

export interface InfoTipProps {
  /** What the button announces to a screen reader — "What a domain file is", not "More info". */
  label: string;
  children: ReactNode;
}

export const InfoTip = ({ label, children }: InfoTipProps): ReactNode => {
  const [open, setOpen] = useState(false);
  return (
    <span className="mj-infotip">
      <button
        type="button"
        className="mj-info"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={(event) => {
          // Target cards are buttons themselves; the info button must not choose the target.
          event.stopPropagation();
          event.preventDefault();
          setOpen(!open);
        }}
      >
        <Info />
      </button>
      {open && (
        <span className="mj-info-body" role="note">
          {children}
        </span>
      )}
    </span>
  );
};

export default InfoTip;
