import { WidgetGoal } from "@mediajel/assistant-core/types";
import { KeyboardEvent, ReactNode } from "react";

import type { TagActivity } from "~/service/client";
import { BandChart, DaysTable, dayValues, useChosenDay } from "~/ui/components/DayBands";
import { Band, Day, daysToDraw, readoutLabel, stripBands, todayOf } from "~/ui/days";

/**
 * The week on the main panel: two bands under a tag's counts — page views, and the job's own
 * measure — for the tag the tally's sentence singles out. One day is read at a time: the caption
 * names it, and each band's header prints its count for that day; Details draws every band of
 * every tag.
 */

type Answered = Extract<TagActivity, { status: "ok" }>;

/** "By day · Today so far · Wed, Sep 16", the day in ink; the counts follow it for a screen reader only. */
const Caption = ({ day, bands, today }: { day: Day; bands: Band[]; today: string }): ReactNode => (
  <figcaption className="mb-1 text-xs text-muted-foreground" aria-live="polite">
    By day · <span className="text-foreground">{readoutLabel(day.day, today)}</span>
    <span className="sr-only"> — {dayValues(day, bands)}</span>
  </figcaption>
);

interface WeekFigureProps {
  days: Day[];
  goal: WidgetGoal;
  /** A refresh is in flight: the reading it sits in is dimmed, and this says so to a screen reader. */
  stale: boolean;
  chosen: number;
  onChoose(index: number | null): void;
  step(event: KeyboardEvent): void;
}

const WeekFigure = ({ days, goal, stale, chosen, onChoose, step }: WeekFigureProps): ReactNode => {
  const bands = stripBands(goal);
  const today = todayOf();
  return (
    <figure data-slot="week" data-stale={stale || undefined} className="mx-0 mt-3 mb-0" aria-busy={stale}>
      <Caption day={days[chosen]} bands={bands} today={today} />
      <BandChart days={days} bands={bands} plot={40} chosen={chosen} onChoose={onChoose} step={step} today={today} />
      <DaysTable days={days} bands={bands} today={today} />
    </figure>
  );
};

/** A tag's week under its counts — or nothing, when the record has no days to draw. */
export const ActivityWeek = ({
  result,
  goal,
  stale,
}: {
  result: Answered;
  goal: WidgetGoal;
  stale: boolean;
}): ReactNode => {
  const days = daysToDraw(result.daily ?? []);
  const { chosen, choose, step } = useChosenDay(days.length);
  if (days.length === 0) return null;
  return <WeekFigure days={days} goal={goal} stale={stale} chosen={chosen} onChoose={choose} step={step} />;
};
