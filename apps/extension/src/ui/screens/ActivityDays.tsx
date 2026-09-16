import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { BarRounded } from "@visx/shape";
import { KeyboardEvent, PointerEvent, ReactNode, RefObject, useEffect, useRef, useState } from "react";

import {
  Band,
  Day,
  axisLabel,
  bandsFor,
  dayAfterKey,
  dayAt,
  daysToDraw,
  readoutLabel,
  todayOf,
  topOf,
} from "~/ui/days";

/**
 * By day: a tag's last week as columns, one band per measure over a shared day axis.
 *
 * Bands rather than one plot, because page views run hundreds or thousands of times the conversions: on
 * one scale the transactions lie flat on the baseline, and a second axis would let a count cross a total
 * at a point that means nothing. One day is read at a time — the latest at rest, or whichever the pointer
 * or the arrow keys choose — and printed above the bands, where it covers no column.
 */

const LABEL = 18;
const PLOT = 36;
const GAP = 10;
const AXIS = 18;
/** Columns stay narrow however wide the panel is dragged, so a week never turns into blocks. */
const BAR = 22;
const RADIUS = 3;

/** The width the figure is given, followed as the panel is resized. */
const useWidth = (): [RefObject<HTMLDivElement>, number] => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

interface Columns {
  /** The left edge of a day's bar. */
  barX(index: number): number;
  barWidth: number;
  /** The width every day owns — its bar, the air around it, and its share of the pointer. */
  step: number;
}

const columnsFor = (width: number, count: number): Columns => {
  // Outer padding half the inner makes every day's share of the width equal, so a pointer maps straight onto one.
  const x = scaleBand({ domain: [...Array(count).keys()], range: [0, width], paddingInner: 0.4, paddingOuter: 0.2 });
  const barWidth = Math.min(BAR, x.bandwidth());
  return { barX: (index) => (x(index) ?? 0) + (x.bandwidth() - barWidth) / 2, barWidth, step: x.step() };
};

interface BarProps {
  value: number;
  y(value: number): number;
  x: number;
  width: number;
  today: boolean;
}

/** Nothing draws nothing; anything at all draws at least a sliver, rather than rounding down to none. */
const DayBar = ({ value, y, x, width, today }: BarProps): ReactNode => {
  if (value <= 0) return null;
  const height = Math.max(1, PLOT - y(value));
  return (
    <BarRounded
      className={today ? "mj-days-bar mj-days-bar--today" : "mj-days-bar"}
      x={x}
      y={PLOT - height}
      width={width}
      height={height}
      radius={RADIUS}
      top
    />
  );
};

interface BandProps {
  band: Band;
  days: Day[];
  index: number;
  width: number;
  columns: Columns;
  today: string;
}

const BandRow = ({ band, days, index, width, columns, today }: BandProps): ReactNode => {
  const peak = topOf(days, band.measure);
  const y = scaleLinear({ domain: [0, peak || 1], range: [PLOT, 0] });
  return (
    <Group top={index * (LABEL + PLOT + GAP)}>
      <text className="mj-days-band" y={11}>
        {band.label}
      </text>
      <text className="mj-days-peak" x={width} y={11}>
        {band.short(peak)}
      </text>
      <Group top={LABEL}>
        <line className="mj-days-rule" x2={width} y1={0.5} y2={0.5} />
        <line className="mj-days-rule" x2={width} y1={PLOT - 0.5} y2={PLOT - 0.5} />
        {days.map((day, column) => (
          <DayBar
            key={day.day}
            value={day[band.measure]}
            y={y}
            x={columns.barX(column)}
            width={columns.barWidth}
            today={day.day === today}
          />
        ))}
      </Group>
    </Group>
  );
};

const DayAxis = ({ days, columns, chosen, today }: { days: Day[]; columns: Columns; chosen: number; today: string }) =>
  days.map((day, column) => (
    <text
      key={day.day}
      className={column === chosen ? "mj-days-day mj-days-day--chosen" : "mj-days-day"}
      x={column * columns.step + columns.step / 2}
      y={13}
    >
      {axisLabel(day.day, today)}
    </text>
  ));

const Readout = ({ day, bands, today }: { day: Day; bands: Band[]; today: string }): ReactNode => (
  <div className="mj-days-readout" aria-live="polite">
    <p className="mj-days-when">{readoutLabel(day.day, today)}</p>
    <dl className="mj-days-values">
      {bands.map((band) => (
        <div key={band.measure}>
          <dt>{band.label}</dt>
          <dd>{band.format(day[band.measure])}</dd>
        </div>
      ))}
    </dl>
  </div>
);

/** The figure's numbers as a table, for a screen reader: the columns are drawn for eyes only. */
const DaysTable = ({ days, bands, today }: { days: Day[]; bands: Band[]; today: string }): ReactNode => (
  <table className="mj-visually-hidden">
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

const DaysFigure = ({ days }: { days: Day[] }): ReactNode => {
  const bands = bandsFor(days);
  const today = todayOf();
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const chosen = active ?? days.length - 1;
  const height = bands.length * (LABEL + PLOT) + (bands.length - 1) * GAP + AXIS;
  const columns = columnsFor(width, days.length);

  const follow = (event: PointerEvent<SVGRectElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    setActive(dayAt(event.clientX - box.left, box.width, days.length));
  };
  const step = (event: KeyboardEvent<HTMLDivElement>): void => {
    const next = event.key === "Escape" ? null : dayAfterKey(event.key, active, days.length);
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
  };

  return (
    <figure className="mj-days">
      <Readout day={days[chosen]} bands={bands} today={today} />
      <div
        ref={ref}
        className="mj-days-plot"
        tabIndex={0}
        role="group"
        aria-label="Days — the left and right arrow keys read each one"
        onKeyDown={step}
      >
        {width > 0 && (
          <svg width={width} height={height} aria-hidden="true">
            <rect className="mj-days-wash" x={chosen * columns.step} width={columns.step} height={height} rx={RADIUS} />
            {bands.map((band, index) => (
              <BandRow
                key={band.measure}
                band={band}
                days={days}
                index={index}
                width={width}
                columns={columns}
                today={today}
              />
            ))}
            <Group top={height - AXIS}>
              <DayAxis days={days} columns={columns} chosen={chosen} today={today} />
            </Group>
            <rect
              className="mj-days-capture"
              width={width}
              height={height}
              onPointerMove={follow}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        )}
      </div>
      <DaysTable days={days} bands={bands} today={today} />
      <p className="mj-fine mj-days-note">Days run midnight to midnight UTC.</p>
    </figure>
  );
};

/** A tag's week, or why there is none to draw. Null days are a read that failed, not a quiet week. */
export const DaysSection = ({ daily }: { daily: Day[] | null | undefined }): ReactNode => {
  const days = daily ? daysToDraw(daily) : null;
  return (
    <div className="mj-days-section">
      <h4 className="mj-pages-title">By day</h4>
      {days === null ? (
        <p className="mj-empty">Day-by-day counts aren’t available from the assistant service right now.</p>
      ) : days.length === 0 ? (
        <p className="mj-empty">No days to show.</p>
      ) : (
        <DaysFigure days={days} />
      )}
    </div>
  );
};
