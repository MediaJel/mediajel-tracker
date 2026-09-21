import { ReactNode } from "react";

import { cn } from "~/lib/utils";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { Button } from "~/ui/components/ui/button";
import { Skeleton } from "~/ui/components/ui/skeleton";

/**
 * What the tally says instead of its readings — each one a different fact, never zeros — and the
 * skeleton that holds the readings' place. Shared by Overview and Analytics, so the two views say
 * the same thing about the same page.
 */

/** More readings than this and a heading stops being a heading; the rest are in Analytics. */
export const MAX_READINGS = 3;

const ACTIVITY_RETRY_ID = "mj-activity-retry";

export const Note = ({ children, problem = false }: { children: ReactNode; problem?: boolean }): ReactNode => (
  <p
    data-slot="tally-note"
    data-problem={problem || undefined}
    className={cn("mt-2 mb-0 text-md leading-[1.5]", problem ? "text-foreground" : "text-muted-foreground")}
  >
    {children}
  </p>
);

export const Failure = ({ activity }: { activity: TagActivityState }): ReactNode => (
  <Note problem>
    {activity.error || "Tag activity couldn’t load."} That says nothing about whether the tags are firing.{" "}
    <Button id={ACTIVITY_RETRY_ID} type="button" variant="link" size="none" onClick={activity.refresh}>
      Try again
    </Button>
  </Note>
);

const QUIET: Partial<Record<TagActivityState["phase"], string>> = {
  listening: "Listening for this page’s tags…",
  "no-tags":
    "No MediaJel tag has announced itself or sent events from this page. Still listening: a tag that loads later, or one a page-speed plugin releases when you interact with the page, appears here on its own.",
  "not-configured": "Tag activity isn’t set up on the assistant service yet.",
};

/** What the tally says when there is nothing to read yet and no failure to report, if anything. */
export const quietNote = (activity: TagActivityState): string | undefined => QUIET[activity.phase];

/** How many readings the skeleton holds a place for: one per tag known, at least one, at most the tally's. */
export const settlingRows = (activity: TagActivityState): number =>
  Math.min(Math.max(activity.tags.length, 1), MAX_READINGS);

/** The opening skeleton holds the tally's place too, so the view does not jump when it arrives. */
export const TallySettling = ({ readings }: { readings: number }): ReactNode => (
  <div className="mt-2.5 grid gap-3" aria-hidden="true">
    {Array.from({ length: readings }, (_, index) => (
      <div key={index} className="grid gap-1.5">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-9" />
      </div>
    ))}
  </div>
);
