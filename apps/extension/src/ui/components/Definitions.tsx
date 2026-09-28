import { Fragment, ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * Counts and facts as a definition list: labels in soft ink, values in tabular figures against
 * the right edge, two pairs to a row when the sheet is wide enough for them. A reading, not a
 * hero row — the numbers are set in the body size, and the label is printed beside each one.
 */
export const Definitions = ({
  entries,
  className,
}: {
  /** Label and value, in reading order. */
  entries: readonly (readonly [ReactNode, ReactNode])[];
  className?: string;
}): ReactNode => (
  <dl className={cn("m-0 mb-1 grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1.5 text-base tabular-nums", className)}>
    {entries.map(([label, value], index) => (
      // A label may repeat on purpose (two tags' page views); the position is what tells them apart.
      <Fragment key={index}>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="m-0 text-right tabular-nums">{value}</dd>
      </Fragment>
    ))}
  </dl>
);
