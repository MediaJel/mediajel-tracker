import { ReactNode } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";
import { WidgetGoal } from "@mediajel/assistant-core/types";

import { cn } from "~/lib/utils";
import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { stripTag, tallyNumber, tallySentence } from "~/ui/activity";
import InfoTip from "~/ui/components/InfoTip";
import { Stack } from "~/ui/components/Panel";
import { Button } from "~/ui/components/ui/button";
import { Failure, MAX_READINGS, Note, TallySettling, quietNote, settlingRows } from "~/ui/screens/ActivityNotes";
import { TagCounts, TagHeading } from "~/ui/screens/ActivityReading";
import { ActivityWeek } from "~/ui/screens/ActivityWeek";
import { SimulatorSection } from "~/ui/screens/SimulatorSection";
import type { SimulationState } from "~/sidepanel/useSimulation";

/**
 * Overview: the tally — what MediaJel has recorded from this site's tags over the last 7 days,
 * on one sheet, the first view of the work order.
 *
 * It is a reading, not a dashboard: one reading per tag, headed by the app ID it is about — a
 * number never appears without the tag it belongs to — the four counts under that, the week
 * under the tag the sentence singles out, and a sentence only when there is something to say.
 * Analytics has every reading in full; past three, the rest are there.
 */

type Props = { activity: TagActivityState; goal: WidgetGoal; onAnalytics(): void };

type OverviewProps = Props & {
  site: string;
  simulation: SimulationState;
  /** Where the simulator's URL field starts. */
  lastUrl: string;
};

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
    <TagHeading appId={result.appId} tag={tag} />
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

/** The readings past the third are one tab away, and the note says so with the way there. */
const MoreTags = ({ hidden, onAnalytics }: { hidden: number; onAnalytics(): void }): ReactNode =>
  hidden > 0 ? (
    <Note>
      {hidden === 1 ? "One more tag" : `${hidden} more tags`} in{" "}
      <Button type="button" variant="link" size="none" onClick={onAnalytics}>
        Analytics
      </Button>
      .
    </Note>
  ) : null;

/** The one line of record the tally adds — set in the impression a receipt leaves. */
const Sentence = ({ text }: { text: string }): ReactNode =>
  text ? (
    <p data-slot="tally-sentence" className="mt-2.5 mb-0 text-md leading-[1.5] text-carbon-ink">
      {text}
    </p>
  ) : null;

/** The tag whose week is drawn under its counts: the one the sentence is about, among the readings on screen. */
const weekOf = (shown: TagActivity[], goal: WidgetGoal): string | undefined => stripTag(shown, goal)?.appId;

/** A refresh keeps the readings where they are, dimmed, rather than blanking the sheet. */
const Readings = ({ activity, goal, onAnalytics }: Props): ReactNode => {
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
      <MoreTags hidden={activity.results.length - MAX_READINGS} onAnalytics={onAnalytics} />
      <Sentence text={tallySentence(activity.results, goal)} />
    </>
  );
};

/** Everything the tally can say instead of its readings — each one a different fact, never zeros. */
const Body = (props: Props): ReactNode => {
  const { activity } = props;
  if (activity.phase === "ready") return <Readings {...props} />;
  if (activity.phase === "error") return <Failure activity={activity} />;
  const note = quietNote(activity);
  if (note) return <Note>{note}</Note>;
  return <TallySettling readings={settlingRows(activity)} />;
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

/**
 * One sheet, two sections: the simulator first — a tag tried on this site before a client installs
 * it — then the tally.
 */
export const OverviewView = ({ site, simulation, lastUrl, ...props }: OverviewProps): ReactNode => (
  <Stack>
    <div className="bg-sheet shadow-press tear-bottom">
      <SimulatorSection site={site} simulation={simulation} lastUrl={lastUrl} />
      <Tally {...props} />
    </div>
  </Stack>
);

const Tally = (props: Props): ReactNode => (
  <section
    data-slot="overview"
    className="px-5 pt-4 pb-[18px]"
    aria-labelledby="mj-tally-title"
    aria-busy={props.activity.phase === "loading" || props.activity.refreshing}
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
    </div>
    <Body {...props} />
  </section>
);
