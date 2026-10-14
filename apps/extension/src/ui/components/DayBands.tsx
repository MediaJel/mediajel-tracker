import { KeyboardEvent, ReactNode, useState } from "react";
import { Bar, BarChart, Cell, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";

import { cn } from "~/lib/utils";
import { ChartContainer, ChartTooltip } from "~/ui/components/ui/chart";
import { Band, Day, Measure, axisLabel, dayAfterKey, readoutLabel, tipLabel, topOf } from "~/ui/days";

/**
 * A tag's days as bands: one small chart per measure over a shared day axis, on shadcn's Chart.
 *
 * Bands rather than one plot, because page views run hundreds or thousands of times the
 * conversions: on one scale the transactions lie flat on the baseline, and a second axis would let
 * a count cross a total at a point that means nothing. One day is read at a time — the latest at
 * rest, or whichever the pointer or the arrow keys choose — and each band prints that day's count
 * in its own header, beside its name, so the figure is read like the tally above it: a name, then
 * its number. Under a pointer the band being hovered also says the day and its count beside the
 * column, the way a chart is expected to. The scale is one quiet figure at the top of each band's
 * right edge. The columns are carbon ink, the record's own mark; today's, still filling, is the
 * same ink at half strength; the wash under the chosen day, drawn in every band, is the only
 * colour that moves.
 */

/** Room under the last band for the day names. */
const AXIS = 18;
/** Room above a band for the top-of-scale figure, which sits centred on the top hairline. */
const HEADROOM = 6;
/** The gutter at the right where the top-of-scale figure is printed. */
const GUTTER = 30;
/** Column width: narrow enough that seven of them read as marks over a week, not as blocks. */
const COLUMN = 16;

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

/**
 * The day recharts says the pointer is over. Recharts 3 reports the index as a string (its tooltip
 * indices are strings, so that two-dimensional charts can share the type), recharts 2 as a number;
 * anything that is not a day — nothing under the pointer, or "-1" — reads as no choice.
 */
const hoveredIndex = (state: { activeTooltipIndex?: number | string | null }): number | null => {
  const index = Number(state.activeTooltipIndex ?? NaN);
  return Number.isInteger(index) && index >= 0 ? index : null;
};

/** What recharts hands a custom tick: where to draw it, and what it names. */
interface TickProps<Value> {
  x: number;
  y: number;
  payload: { value: Value; index: number };
}

/** A day's name under its column, the chosen one in ink. */
const DayTick = ({
  x,
  y,
  payload,
  chosen,
  today,
}: TickProps<string> & { chosen: number; today: string }): ReactNode => (
  <text
    x={x}
    y={y + 10}
    textAnchor="middle"
    className={cn("fill-muted-foreground font-sans text-xs", payload.index === chosen && "fill-foreground")}
  >
    {axisLabel(payload.value, today)}
  </text>
);

/** The band's top, printed once at the right end of its top hairline: the whole scale in one figure. */
const TopTick = ({ x, y, payload, short }: TickProps<number> & { short(value: number): string }): ReactNode => (
  <text x={x} y={y} dy="0.35em" textAnchor="start" className="fill-muted-foreground font-sans text-2xs">
    {short(payload.value)}
  </text>
);

/** What recharts hands a tooltip's content: the day under the pointer, and the band's value for it. */
interface TipProps {
  label?: unknown;
  payload?: readonly { value?: unknown }[];
}

/** "Thu, Sep 17 · 942 page views", beside the column the pointer is on — only in the band it is over. */
const DayTip = ({ label, payload, band, today }: TipProps & { band: Band; today: string }): ReactNode => {
  const value = payload?.[0]?.value;
  if (typeof label !== "string" || typeof value !== "number") return null;
  return (
    <div className="rounded-sm border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-muted-foreground shadow-press">
      {tipLabel(label, today)} ·{" "}
      <span className="font-semibold text-foreground tabular-nums">{band.format(value)}</span>{" "}
      {band.label.toLowerCase()}
    </div>
  );
};

/**
 * Where a band's scale ends: its top rounded to a clean tick, printed once — or 1 for a flat band,
 * so the columns have a height to be nothing against, with no figure claiming a scale.
 */
const scaleOf = (top: number): { end: number; ticks: number[] } => ({ end: top || 1, ticks: top ? [top] : [] });

/** The two hairlines a band hangs between: its base and its top. */
const hairlines = (end: number): ReactNode => [
  <ReferenceLine key="base" y={0} stroke="var(--mj-rule)" />,
  <ReferenceLine key="top" y={end} stroke="var(--mj-rule)" />,
];

/** The wash under the day being read: the whole of its column, base to top, under the ink. */
const wash = (day: string): ReactNode => (
  <ReferenceArea x1={day} x2={day} fill="var(--mj-days-wash)" fillOpacity={1} stroke="none" radius={3} />
);

/** The day names, drawn under the last band only; the axis itself is what places every band's columns. */
const dayAxis = (last: boolean, chosen: number, today: string): ReactNode => (
  <XAxis
    dataKey="day"
    hide={!last}
    axisLine={false}
    tickLine={false}
    height={AXIS}
    interval={0}
    tick={(props: unknown) => <DayTick {...(props as TickProps<string>)} chosen={chosen} today={today} />}
  />
);

/** The scale, as one figure at the right end of the top hairline. */
const scaleAxis = ({ end, ticks }: { end: number; ticks: number[] }, short: Band["short"]): ReactNode => (
  <YAxis
    orientation="right"
    width={GUTTER}
    domain={[0, end]}
    ticks={ticks}
    interval={0}
    axisLine={false}
    tickLine={false}
    tickMargin={4}
    tick={(props: unknown) => <TopTick {...(props as TickProps<number>)} short={short} />}
  />
);

/** The columns: carbon ink, a hairline of it for a day that had any, today's at half strength. */
const columns = (measure: Measure, days: Day[], today: string): ReactNode => (
  <Bar
    dataKey={measure}
    fill="var(--mj-days-ink)"
    radius={[3, 3, 0, 0]}
    minPointSize={(value: number | null | undefined) => (value && value > 0 ? 1 : 0)}
    isAnimationActive={false}
  >
    {days.map((day) => (
      <Cell key={day.day} fillOpacity={day.day === today ? 0.5 : 1} />
    ))}
  </Bar>
);

interface BandProps {
  band: Band;
  days: Day[];
  plot: number;
  last: boolean;
  chosen: number;
  today: string;
  onChoose(index: number | null): void;
}

/**
 * One measure's week: its name and the chosen day's count on a line, the columns under it with the
 * scale's top at their right, and the day names under the last band.
 */
const BandPlot = ({ band, days, plot, last, chosen, today, onChoose }: BandProps): ReactNode => {
  const scale = scaleOf(topOf(days, band.measure));
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">{band.label}</span>
        <span className="text-lg leading-none text-foreground tabular-nums">
          {band.format(days[chosen][band.measure])}
        </span>
      </div>
      <ChartContainer style={{ height: HEADROOM + plot + (last ? AXIS : 0) }}>
        <BarChart
          data={days}
          margin={{ top: HEADROOM, right: 0, bottom: 0, left: 0 }}
          barSize={COLUMN}
          accessibilityLayer={false}
          onMouseMove={(state) => onChoose(hoveredIndex(state))}
          onMouseLeave={() => onChoose(null)}
        >
          {hairlines(scale.end)}
          {wash(days[chosen].day)}
          {dayAxis(last, chosen, today)}
          {scaleAxis(scale, band.short)}
          <ChartTooltip
            cursor={false}
            content={(props: TipProps) => <DayTip {...props} band={band} today={today} />}
            isAnimationActive={false}
            offset={12}
          />
          {columns(band.measure, days, today)}
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
}

/** The figure itself: every band, and one tab stop whose arrow keys read the days. */
export const BandChart = ({ days, bands, plot, chosen, onChoose, step, today }: BandChartProps): ReactNode => (
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
        onChoose={onChoose}
      />
    ))}
  </div>
);

/** The chosen day's counts as one sentence, for whoever cannot see the band headers change. */
export const dayValues = (day: Day, bands: Band[]): string =>
  bands.map((band) => `${band.format(day[band.measure])} ${band.label.toLowerCase()}`).join(" · ");

/** The day being read, named above the bands; its counts are in the band headers, and read out here. */
export const DayReadout = ({ day, bands, today }: { day: Day; bands: Band[]; today: string }): ReactNode => (
  <p className="mt-0 mb-2 text-base text-foreground" aria-live="polite">
    {readoutLabel(day.day, today)}
    <span className="sr-only"> — {dayValues(day, bands)}</span>
  </p>
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
