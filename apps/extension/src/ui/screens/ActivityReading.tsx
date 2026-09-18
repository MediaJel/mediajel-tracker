import { ReactNode } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";

import { cn } from "~/lib/utils";
import type { TagActivity } from "~/service/client";
import { describeTag } from "~/ui/activity";
import { ConfigurationSlip } from "~/ui/screens/ConfigurationSlip";

/**
 * The pieces a tag's reading is made of, on the main panel and on each report sheet alike, so a
 * reading looks the same wherever it is met: which tag it is about, then its four counts with
 * their names printed small above them, read across the way the tally has always read.
 */

/** Which tag a reading is about: its app ID in mono, what the page says of its state, and its configuration, one disclosure down. */
export const TagHeading = ({
  id,
  appId,
  tag,
}: {
  id?: string;
  appId: string;
  tag: TagRecord | undefined;
}): ReactNode => {
  const description = describeTag(tag);
  return (
    <>
      <h3 id={id} className="m-0 font-mono text-sm leading-[1.45] font-normal text-foreground wrap-anywhere">
        {appId}
      </h3>
      {description && <p className="mt-0.5 mb-2 text-xs leading-[1.45] text-muted-foreground">{description}</p>}
      {tag && <ConfigurationSlip tag={tag} />}
    </>
  );
};

const COLUMNS = [
  { key: "pageviews", label: "Page views" },
  { key: "transactions", label: "Transactions" },
  { key: "signups", label: "Sign-ups" },
  { key: "sessions", label: "Sessions" },
] as const;

type Totals = Extract<TagActivity, { status: "ok" }>["totals"];

/** The four counts. A zero is a reading too, but it should not shout over the numbers that moved. */
export const TagCounts = ({
  totals,
  format,
  big = false,
}: {
  totals: Totals;
  /** Compact on the main panel, where four columns share 360px; in full on a sheet. */
  format(value: number): string;
  /** The one reading on a page with one tag is set larger; several share the room. */
  big?: boolean;
}): ReactNode => (
  <dl className="m-0 grid grid-cols-4 gap-x-2 tabular-nums">
    {COLUMNS.map(({ key, label }) => (
      <div key={key} className="min-w-0">
        <dt className="text-xs wrap-anywhere text-muted-foreground">{label}</dt>
        <dd
          className={cn(
            "m-0 font-semibold text-foreground",
            big ? "text-2xl leading-[1.4]" : "text-lg leading-[1.5]",
            totals[key] === 0 && "font-normal text-muted-foreground",
          )}
        >
          {format(totals[key])}
        </dd>
      </div>
    ))}
  </dl>
);
