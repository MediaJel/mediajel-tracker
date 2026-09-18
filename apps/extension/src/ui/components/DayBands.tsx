import { KeyboardEvent, ReactNode, useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from "recharts";

import { cn } from "~/lib/utils";
import { ChartContainer, ChartTooltip } from "~/ui/components/ui/chart";
import { Band, Day, axisLabel, dayAfterKey, readoutLabel, topOf } from "~/ui/days";

/**
 * A tag's days as bands: one small chart per measure over a shared day axis, on shadcn's Chart.
 *
 * Bands rather than one plot, because page views run hundreds or thousands of times the
 * conversions: on one scale the transactions lie flat on the baseline, and a second axis would let
 * a count cross a total at a point that means nothing. One day is read at a time — the latest at
 * rest, or whichever the pointer or the arrow keys choose — and printed above the bands, never
 * over them. The columns are carbon ink, the record's own mark; today's, still filling, is the
 * same ink at half strength; the wash under the chosen day is the only colour that moves.
 */

/** Room under the last band for the day names. */
const AXIS = 18;

/** Which day is being read: the last at rest, whichever a pointer or the keys choose. */
export const useChosenDay = (
  count: number,
): { chosen: number; choose(index: number | null): void; step(event: KeyboardEvent): void } => {
  const [active, setActive] = useState<number | null>(null);
  const chosen = active ?? count - 1;
  const step = (event: KeyboardEvent): void => {
    const next = event.key === "Escape" ? null : dayAfterKey(event.key, active, count);
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  };
  return { chosen, choose: setActive, step };
};

/** The day recharts says the pointer is over, in whichever field this version reports it. */
const hoveredIndex = (state: { activeTooltipIndex?: number | string | null; activeIndex?: number | string | null }) => {
  const index = state.activeTooltipIndex ?? state.activeIndex;
  return typeof index === "number" ? index : null;
};

/** What recharts hands a custom tick: where to draw it, and which day it names. */
interface TickProps {
  x: number;
  y: number;
  payload: { value: string; index: number };
}

/** A day's name under its column, the chosen one in ink. */
const DayTick = ({ x, y, payload, chosen, today }: TickProps & { chosen: number; today: string }): ReactNode => (
  <text
    x={x}
    y={y + 10}
    textAnchor="middle"
    className={cn("fill-muted-foreground font-sans text-xs", payload.index === chosen && "fill-foreground")}
  >
    {axisLabel(payload.value, today)}
  </text>
);

interface BandProps {
  band: Band;
  days: Day[];
  plot: number;
  last: boolean;
  chosen: number;
  today: string;
  syncId: string;
  onChoose(index: number | null): void;
}

/** One measure's week: its name and its top on a line, the columns under it, the day names under the last. */
const BandPlot = ({ band, days, plot, last, chosen, today, syncId, onChoose }: BandProps): ReactNode => {
  const top = topOf(days, band.measure);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>{band.label}</span>
        <span className="tabular-nums">{band.short(top)}</span>
      </div>
      <ChartContainer style={{ height: plot + (last ? AXIS : 0) }}>
        <BarChart
          data={days}
          syncId={syncId}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barSize={22}
          barCategoryGap="40%"
          accessibilityLayer={false}
          onMouseMove={(state) => onChoose(hoveredIndex(state))}
          onMouseLeave={() => onChoose(null)}
        >
          <ReferenceLine y={0} stroke="var(--mj-rule)" />
          <ReferenceLine y={top || 1} stroke="var(--mj-rule)" />
          <XAxis
            dataKey="day"
            hide={!last}
            axisLine={false}
            tickLine={false}
            height={AXIS}
            interval={0}
            tick={(props: unknown) => <DayTick {...(props as TickProps)} chosen={chosen} today={today} />}
          />
          <YAxis hide domain={[0, top || 1]} />
          <ChartTooltip
            cursor={{ fill: "var(--mj-days-wash)", radius: 3 }}
            content={() => null}
            active
            defaultIndex={chosen}
            isAnimationActive={false}
          />
          <Bar
            dataKey={band.measure}
            fill="var(--mj-days-ink)"
            radius={[3, 3, 0, 0]}
            minPointSize={(value: number | null | undefined) => (value && value > 0 ? 1 : 0)}
            isAnimationActive={false}
          >
            {days.map((day) => (
              <Cell key={day.day} fillOpacity={day.day === today ? 0.5 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export interface BandChartProps {
  days: Day[];
  bands: Band[];
  /** Each band's plot height. */
  plot: number;
  chosen: number;
  onChoose(index: number | null): void;
  step(event: KeyboardEvent): void;
  today: string;
  /** One id per figure, so the wash under the chosen day spans every band of it. */
  syncId: string;
}

/** The figure itself: every band, and one tab stop whose arrow keys read the days. */
export const BandChart = ({ days, bands, plot, chosen, onChoose, step, today, syncId }: BandChartProps): ReactNode => (
  <div
    className="grid gap-2.5 rounded-sm touch-pan-y"
    tabIndex={0}
    role="group"
    aria-label="Days — the left and right arrow keys read each one"
    onKeyDown={step}
  >
    {bands.map((band, index) => (
      <BandPlot
        key={band.measure}
        band={band}
        days={days}
        plot={plot}
        last={index === bands.length - 1}
        chosen={chosen}
        today={today}
        syncId={syncId}
        onChoose={onChoose}
      />
    ))}
  </div>
);

/** The day being read, printed in the tally's form: names above values, never over the columns. */
export const DayReadout = ({ day, bands, today }: { day: Day; bands: Band[]; today: string }): ReactNode => (
  <div className="mb-2" aria-live="polite">
    <p className="mt-0 mb-1.5 text-base text-foreground">{readoutLabel(day.day, today)}</p>
    <dl className="m-0 flex flex-wrap gap-x-4 gap-y-0.5">
      {bands.map((band) => (
        <div key={band.measure} className="flex min-w-16 flex-col">
          <dt className="text-xs text-muted-foreground">{band.label}</dt>
          <dd className="m-0 text-lg text-foreground tabular-nums">{band.format(day[band.measure])}</dd>
        </div>
      ))}
    </dl>
  </div>
);

/** The figure's numbers as a table, for a screen reader: the columns are drawn for eyes only. */
export const DaysTable = ({ days, bands, today }: { days: Day[]; bands: Band[]; today: string }): ReactNode => (
  <table className="sr-only">
    <caption>Each day’s counts for this tag, oldest first</caption>
    <thead>
      <tr>
        <th scope="col">Day</th>
        {bands.map((band) => (
          <th key={band.measure} scope="col">
            {band.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {days.map((day) => (
        <tr key={day.day}>
          <th scope="row">{readoutLabel(day.day, today)}</th>
          {bands.map((band) => (
            <td key={band.measure}>{band.format(day[band.measure])}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
