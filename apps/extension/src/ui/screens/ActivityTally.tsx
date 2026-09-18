import { ReactNode } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";
import { WidgetGoal } from "@mediajel/assistant-core/types";

import { cn } from "~/lib/utils";
import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { describeTag, stripTag, tallyNumber, tallySentence } from "~/ui/activity";
import { Chevron } from "~/ui/components/Chevron";
import InfoTip from "~/ui/components/InfoTip";
import { Button } from "~/ui/components/ui/button";
import { Skeleton } from "~/ui/components/ui/skeleton";
import { TagCounts, TagHeading } from "~/ui/screens/ActivityReading";
import { ActivityWeek } from "~/ui/screens/ActivityWeek";

/**
 * The tally: what MediaJel has recorded from this site's tags over the last 7 days, printed on the
 * work order under the job's name.
 *
 * It sits in the heading rather than in the stack because it is a fact about the site, like the
 * title — it is true before the job starts and it is where the first real conversions show up
 * after Deploy. It is a reading, not a dashboard: one reading per tag, headed by the app ID it is
 * about — a number never appears without the tag it belongs to — the four counts under that, the
 * week under the tag the sentence singles out, and a sentence only when there is something to say.
 * While Details is open the readings step aside, since the report has every one of them in full.
 */

export const ACTIVITY_REPORT_ID = "mj-activity-report";
export const ACTIVITY_DETAILS_ID = "mj-activity-details";
export const ACTIVITY_RETRY_ID = "mj-activity-retry";

type Props = { activity: TagActivityState; goal: WidgetGoal };

/** More readings than this and the heading stops being a heading; the rest are in Details. */
const MAX_READINGS = 3;

/** Partner orange is under 4.5:1 as text on the light sheet, so a problem is said in ink, and the words carry it. */
const Unread = ({ onRetry }: { onRetry(): void }): ReactNode => (
  <p data-slot="tally-unread" className="mt-1 mb-0 text-md text-foreground">
    Couldn’t load.{" "}
    <Button type="button" variant="link" size="none" onClick={onRetry}>
      Try again
    </Button>
  </p>
);

interface ReadingProps {
  result: TagActivity;
  /** What the page says about this tag — its configuration and state — when it has been heard at all. */
  tag: TagRecord | undefined;
  many: boolean;
  /** Whether this is the tag whose week is drawn under its counts. */
  week: boolean;
  goal: WidgetGoal;
  stale: boolean;
  onRetry(): void;
}

/** One tag's reading: which tag, then its counts, then — for the tag the sentence is about — its week. */
const Reading = ({ result, tag, many, week, goal, stale, onRetry }: ReadingProps): ReactNode => (
  <li data-slot="reading">
    <TagHeading appId={result.appId} description={describeTag(tag)} />
    {result.status === "ok" ? (
      <>
        <TagCounts totals={result.totals} format={tallyNumber} big={!many} />
        {week && <ActivityWeek result={result} goal={goal} stale={stale} />}
      </>
    ) : (
      <Unread onRetry={onRetry} />
    )}
  </li>
);

const MoreTags = ({ hidden }: { hidden: number }): ReactNode =>
  hidden > 0 ? <Note>{hidden === 1 ? "One more tag" : `${hidden} more tags`} in Details.</Note> : null;

/** The one line of record the tally adds — set in the impression a receipt leaves. */
const Sentence = ({ text }: { text: string }): ReactNode =>
  text ? (
    <p data-slot="tally-sentence" className="mt-2.5 mb-0 text-md leading-[1.5] text-carbon-ink">
      {text}
    </p>
  ) : null;

/** The tag whose week is drawn under its counts: the one the sentence is about, among the readings on screen. */
const weekOf = (shown: TagActivity[], goal: WidgetGoal): string | undefined => stripTag(shown, goal)?.appId;

/** A refresh keeps the readings where they are, dimmed, rather than blanking the heading. */
const Readings = ({ activity, goal }: Props): ReactNode => {
  const shown = activity.results.slice(0, MAX_READINGS);
  const many = activity.results.length > 1;
  const week = weekOf(shown, goal);
  return (
    <>
      <ol
        data-slot="tally"
        data-many={many || undefined}
        data-stale={activity.refreshing || undefined}
        className={cn(
          "m-0 mt-2.5 grid list-none gap-3 p-0 transition-opacity duration-150 [&>li+li]:border-t [&>li+li]:border-border [&>li+li]:pt-3",
          activity.refreshing && "opacity-50",
        )}
      >
        {shown.map((result) => (
          <Reading
            key={result.appId}
            result={result}
            tag={activity.tags.find((tag) => tag.appId === result.appId)}
            many={many}
            week={result.appId === week}
            goal={goal}
            stale={activity.refreshing}
            onRetry={activity.refresh}
          />
        ))}
      </ol>
      <MoreTags hidden={activity.results.length - MAX_READINGS} />
      <Sentence text={tallySentence(activity.results, goal)} />
    </>
  );
};

/** The opening skeleton holds the tally's place too, so the stack does not jump when it arrives. */
const TallySettling = ({ readings }: { readings: number }): ReactNode => (
  <div className="mt-2.5 grid gap-3" aria-hidden="true">
    {Array.from({ length: readings }, (_, index) => (
      <div key={index} className="grid gap-1.5">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-9" />
      </div>
    ))}
  </div>
);

const Note = ({ children, problem = false }: { children: ReactNode; problem?: boolean }): ReactNode => (
  <p
    data-slot="tally-note"
    data-problem={problem || undefined}
    className={cn("mt-2 mb-0 text-md leading-[1.5]", problem ? "text-foreground" : "text-muted-foreground")}
  >
    {children}
  </p>
);

const Failure = ({ activity }: { activity: TagActivityState }): ReactNode => (
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
const quietNote = (activity: TagActivityState): string | undefined => QUIET[activity.phase];

/** Everything the tally can say instead of its readings — each one a different fact, never zeros. */
const Body = ({ activity, goal }: Props): ReactNode => {
  if (activity.phase === "ready") return <Readings activity={activity} goal={goal} />;
  if (activity.phase === "error") return <Failure activity={activity} />;
  const note = quietNote(activity);
  if (note) return <Note>{note}</Note>;
  return <TallySettling readings={Math.min(Math.max(activity.tags.length, 1), MAX_READINGS)} />;
};

const DetailsToggle = ({ activity }: { activity: TagActivityState }): ReactNode => {
  const open = activity.reportOpen;
  return (
    <Button
      id={ACTIVITY_DETAILS_ID}
      type="button"
      variant="ghost"
      size="none"
      className="ml-auto gap-[3px] py-[3px] pl-1.5 font-display text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:text-foreground"
      aria-expanded={open}
      aria-controls={open ? ACTIVITY_REPORT_ID : undefined}
      onClick={open ? activity.closeReport : activity.openReport}
    >
      Details
      <Chevron up={open} />
    </Button>
  );
};

/** What each column counts, and what leaves the browser to find out. */
const WhatCounts = (): ReactNode => (
  <InfoTip label="What tag activity counts">
    <div className="grid gap-1.5">
      <p className="m-0">
        Each reading is one MediaJel tag found on this page, named by its app ID. Page views are page_view events;
        sessions are visits, split by 30 minutes without activity; transactions are purchases that carried an order id
        and a total; sign-ups are sign_up events or events carrying sign-up details.
      </p>
      <p className="m-0">
        From MediaJel’s live tag activity, which keeps 7 days. Counts trail the site by up to an hour.
      </p>
      <p className="m-0 text-privacy">
        To look this up, the assistant sends these tags’ app IDs to MediaJel — nothing from the page itself.
      </p>
    </div>
  </InfoTip>
);

export const ActivityTally = ({ activity, goal }: Props): ReactNode => (
  <section
    className="mt-4"
    aria-labelledby="mj-tally-title"
    aria-busy={activity.phase === "loading" || activity.refreshing}
  >
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <h2
        id="mj-tally-title"
        className="m-0 font-display text-xs font-semibold tracking-caps text-muted-foreground uppercase"
      >
        Tag activity{" "}
        <span className="ml-1.5 font-sans text-sm font-normal tracking-normal normal-case">Last 7 days</span>
      </h2>
      <WhatCounts />
      {activity.phase === "ready" && <DetailsToggle activity={activity} />}
    </div>
    {/* Details has every reading in full, so while it is open the heading keeps only this line. */}
    {!activity.reportOpen && <Body activity={activity} goal={goal} />}
  </section>
);
