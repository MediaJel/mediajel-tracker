import { ReactNode } from "react";

import { BandChart, DayReadout, DaysTable, useChosenDay } from "~/ui/components/DayBands";
import { Empty, Fine } from "~/ui/components/Section";
import { Day, bandsFor, daysToDraw, todayOf } from "~/ui/days";

/**
 * By day, on a report sheet: a tag's last week in every band the record has — the four counts, and
 * the transaction total once there is any money — with the day being read printed above them.
 */

const DaysFigure = ({ days }: { days: Day[] }): ReactNode => {
  const bands = bandsFor(days);
  const today = todayOf();
  const { chosen, choose, step } = useChosenDay(days.length);
  return (
    <figure className="m-0">
      <DayReadout day={days[chosen]} bands={bands} today={today} />
      <BandChart
        days={days}
        bands={bands}
        plot={36}
        chosen={chosen}
        onChoose={choose}
        step={step}
        today={today}
        syncId="days"
      />
      <DaysTable days={days} bands={bands} today={today} />
      <Fine className="mt-1.5">Days run midnight to midnight UTC.</Fine>
    </figure>
  );
};

const figureFor = (days: Day[] | null): ReactNode => {
  if (days === null) return <Empty>Day-by-day counts aren’t available from the assistant service right now.</Empty>;
  if (days.length === 0) return <Empty>No days to show.</Empty>;
  return <DaysFigure days={days} />;
};

/** A tag's week, or why there is none to draw. Null days are a read that failed, not a quiet week. */
export const DaysSection = ({ daily }: { daily: Day[] | null | undefined }): ReactNode => (
  <div data-slot="days" className="mt-[18px]">
    <h4 className="mt-0 mb-1 font-display text-base font-semibold text-foreground">By day</h4>
    {figureFor(daily ? daysToDraw(daily) : null)}
  </div>
);
