import { WidgetGoal } from "@mediajel/assistant-core/types";
import { KeyboardEvent, ReactNode } from "react";

import { cn } from "~/lib/utils";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { shortAppId, stripTag } from "~/ui/activity";
import { BandChart, DaysTable, dayValues, useChosenDay } from "~/ui/components/DayBands";
import { Band, Day, daysToDraw, readoutLabel, stripBands, todayOf } from "~/ui/days";

/**
 * The week on the main panel: two bands under the tally — page views, and the job's own measure —
 * for the tag the tally already singles out. One day is read at a time: the caption names it, and
 * each band's header prints its count for that day; Details draws every band of every tag. With
 * several tags the caption leads with the short app ID, the one place an app id reaches the
 * heading, because two weeks cannot otherwise be told apart.
 */

/** "By day · Today so far · Wed, Sep 16", the day in ink; the counts follow it for a screen reader only. */
const Caption = ({
  prefix,
  day,
  bands,
  today,
}: {
  prefix: string;
  day: Day;
  bands: Band[];
  today: string;
}): ReactNode => (
  <figcaption className="mb-1 text-xs text-muted-foreground" aria-live="polite">
    {prefix}By day · <span className="text-foreground">{readoutLabel(day.day, today)}</span>
    <span className="sr-only"> — {dayValues(day, bands)}</span>
  </figcaption>
);

interface Week {
  /** The short app ID that leads the caption when the page has several tags, else "". */
  prefix: string;
  days: Day[];
}

/** With several tags the caption leads with the short app ID; with one there is nothing to tell apart. */
const prefixFor = (activity: TagActivityState, appId: string): string =>
  activity.results.length > 1 ? `${shortAppId(appId)} · ` : "";

/** The week to strip, or null when no tag has days to draw — nothing is said in that case. */
const weekOf = (activity: TagActivityState, goal: WidgetGoal): Week | null => {
  const tag = stripTag(activity.results, goal);
  if (!tag?.daily) return null;
  const days = daysToDraw(tag.daily);
  if (days.length === 0) return null;
  return { prefix: prefixFor(activity, tag.appId), days };
};

interface WeekFigureProps extends Week {
  goal: WidgetGoal;
  /** A refresh keeps the week where it is, dimmed, the way the readings above it are. */
  stale: boolean;
  chosen: number;
  onChoose(index: number | null): void;
  step(event: KeyboardEvent): void;
}

const WeekFigure = ({ prefix, days, goal, stale, chosen, onChoose, step }: WeekFigureProps): ReactNode => {
  const bands = stripBands(goal);
  const today = todayOf();
  return (
    <figure
      data-slot="week"
      data-stale={stale || undefined}
      className={cn("mx-0 mt-2.5 mb-0 transition-opacity duration-150", stale && "opacity-50")}
      aria-busy={stale}
    >
      <Caption prefix={prefix} day={days[chosen]} bands={bands} today={today} />
      <BandChart days={days} bands={bands} plot={40} chosen={chosen} onChoose={onChoose} step={step} today={today} />
      <DaysTable days={days} bands={bands} today={today} />
    </figure>
  );
};

export const ActivityWeek = ({ activity, goal }: { activity: TagActivityState; goal: WidgetGoal }): ReactNode => {
  const week = weekOf(activity, goal);
  const { chosen, choose, step } = useChosenDay(week?.days.length ?? 0);
  if (!week) return null;
  return <WeekFigure {...week} goal={goal} stale={activity.refreshing} chosen={chosen} onChoose={choose} step={step} />;
};
