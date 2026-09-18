import { ReactNode } from "react";

import { WidgetGoal } from "@mediajel/assistant-core/types";

import { cn } from "~/lib/utils";
import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { shortAppId, stateSentence, tallyNumber, tallySentence } from "~/ui/activity";
import { Chevron } from "~/ui/components/Chevron";
import InfoTip from "~/ui/components/InfoTip";
import { Button } from "~/ui/components/ui/button";
import { Skeleton } from "~/ui/components/ui/skeleton";
import { ActivityWeek } from "~/ui/screens/ActivityWeek";

/**
 * The tally: what MediaJel has recorded from this site's tags over the last 7 days, printed on the
 * work order under the job's name.
 *
 * It sits in the heading rather than in the stack because it is a fact about the site, like the
 * title — it is true before the job starts and it is where the first real conversions show up
 * after Deploy — so it never scrolls away. It is a reading, not a dashboard: one row per tag, the
 * column names printed once, the week under the rows, and a sentence only when there is something
 * to say.
 */

export const ACTIVITY_REPORT_ID = "mj-activity-report";
export const ACTIVITY_DETAILS_ID = "mj-activity-details";
export const ACTIVITY_RETRY_ID = "mj-activity-retry";

type Props = { activity: TagActivityState; goal: WidgetGoal };

const COLUMNS = [
  { key: "pageviews", label: "Page views" },
  { key: "transactions", label: "Transactions" },
  { key: "signups", label: "Sign-ups" },
  { key: "sessions", label: "Sessions" },
] as const;

/** More rows than this and the heading stops being a heading; the rest are in Details. */
const MAX_ROWS = 3;

/** The cells are read across, so each one is cut rather than wrapped — except the names, below. */
const CELL = "overflow-hidden pr-1.5 text-left text-ellipsis whitespace-nowrap";

/** A zero is a reading too, but it should not shout over the numbers that moved. */
const Values = ({ result, many }: { result: Extract<TagActivity, { status: "ok" }>; many: boolean }): ReactNode =>
  COLUMNS.map(({ key }) => (
    <td
      key={key}
      className={cn(
        CELL,
        "font-semibold text-foreground",
        many ? "text-lg leading-[1.5]" : "text-2xl leading-[1.4]",
        result.totals[key] === 0 && "font-normal text-muted-foreground",
      )}
    >
      {tallyNumber(result.totals[key])}
    </td>
  ));

/** Partner orange is under 4.5:1 as text on the light sheet, so a problem is said in ink, and the words carry it. */
const Unread = ({ onRetry }: { onRetry(): void }): ReactNode => (
  <td
    colSpan={COLUMNS.length}
    data-slot="tally-unread"
    className="overflow-visible text-md whitespace-normal text-foreground"
  >
    Couldn’t load.{" "}
    <Button type="button" variant="link" size="none" onClick={onRetry}>
      Try again
    </Button>
  </td>
);

const Row = ({ result, many, onRetry }: { result: TagActivity; many: boolean; onRetry(): void }): ReactNode => (
  <tr>
    {many && (
      <th scope="row" className={cn(CELL, "font-mono text-xs font-normal text-muted-foreground")} title={result.appId}>
        {shortAppId(result.appId)}
      </th>
    )}
    {result.status === "ok" ? <Values result={result} many={many} /> : <Unread onRetry={onRetry} />}
  </tr>
);

/** A column name wraps rather than being cut to "Transactio…" when the panel is narrower than 400px. */
const ColumnNames = ({ many }: { many: boolean }): ReactNode => (
  <thead>
    <tr>
      {many && (
        <th scope="col" className={cn(CELL, "w-[66px]")}>
          <span className="sr-only">Tag</span>
        </th>
      )}
      {COLUMNS.map(({ key, label }) => (
        <th
          key={key}
          scope="col"
          className={cn(CELL, "text-xs font-normal wrap-anywhere whitespace-normal text-muted-foreground")}
        >
          {label}
        </th>
      ))}
    </tr>
  </thead>
);

const MoreTags = ({ hidden }: { hidden: number }): ReactNode =>
  hidden > 0 ? <Note>{hidden === 1 ? "One more tag" : `${hidden} more tags`} in Details.</Note> : null;

/** The one line of record the tally adds — set in the impression a receipt leaves. */
const Sentence = ({ text }: { text: string }): ReactNode =>
  text ? (
    <p data-slot="tally-sentence" className="mt-2 mb-0 text-md leading-[1.5] text-carbon-ink">
      {text}
    </p>
  ) : null;

/** A refresh keeps the readings where they are, dimmed, rather than blanking the heading. */
const Readings = ({ activity, goal }: Props): ReactNode => {
  const many = activity.results.length > 1;
  return (
    <>
      <table
        data-slot="tally"
        data-many={many || undefined}
        data-stale={activity.refreshing || undefined}
        className={cn(
          "mt-2 w-full table-fixed border-collapse transition-opacity duration-150 tabular-nums",
          activity.refreshing && "opacity-50",
        )}
      >
        <ColumnNames many={many} />
        <tbody>
          {activity.results.slice(0, MAX_ROWS).map((result) => (
            <Row key={result.appId} result={result} many={many} onRetry={activity.refresh} />
          ))}
        </tbody>
      </table>
      <MoreTags hidden={activity.results.length - MAX_ROWS} />
      <ActivityWeek activity={activity} goal={goal} />
      <Sentence text={tallySentence(activity.results, goal)} />
      <Sentence text={stateSentence(activity.tags)} />
    </>
  );
};

/** The opening skeleton holds the tally's place too, so the stack does not jump when it arrives. */
const TallySettling = ({ rows }: { rows: number }): ReactNode => (
  <div className="mt-2 grid gap-1.5" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <Skeleton key={index} className="h-3.5 first:h-9" />
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
  return note ? <Note>{note}</Note> : <TallySettling rows={Math.min(Math.max(activity.tags.length, 1), MAX_ROWS)} />;
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
        Each row is one MediaJel tag found on this page. Page views are page_view events; sessions are visits, split by
        30 minutes without activity; transactions are purchases that carried an order id and a total; sign-ups are
        sign_up events or events carrying sign-up details.
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
    <Body activity={activity} goal={goal} />
  </section>
);
