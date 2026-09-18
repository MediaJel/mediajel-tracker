import { ReactNode, useState } from "react";

import { cn } from "~/lib/utils";
import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { amount, describeTag, fullNumber, pageLabel, pageListing, when } from "~/ui/activity";
import InfoTip from "~/ui/components/InfoTip";
import { Stack } from "~/ui/components/Panel";
import { Empty, Fine, SheetGroup } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";
import { Input } from "~/ui/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/ui/components/ui/table";
import { DaysSection } from "~/ui/screens/ActivityDays";
import { TagCounts, TagHeading } from "~/ui/screens/ActivityReading";
import { Failure, Note, TallySettling, quietNote, settlingRows } from "~/ui/screens/ActivityNotes";

/**
 * Analytics: the whole of each tag's last 7 days, one sheet per tag — the second view of the
 * work order, where Overview's readings are printed in full.
 *
 * A sheet reads top to bottom in one order: which tag, its counts in the tally's form but in full,
 * the money and the last events, then the days, then the pages the conversions happened on. When
 * there are no readings yet the view says exactly what Overview says, so the tab never opens on
 * nothing.
 */

type Answered = Extract<TagActivity, { status: "ok" }>;
type Page = NonNullable<Answered["pages"]>[number];

/** A page: its path in mono with an off-site host under it, then how many conversions and how much. */
const PageRow = ({ page, site }: { page: Page; site: string }): ReactNode => {
  const { path, host } = pageLabel(page.pageUrl, site);
  return (
    <TableRow>
      <TableCell>
        <span className="block font-mono text-sm text-foreground wrap-anywhere">{path}</span>
        {host && <span className="block text-xs text-muted-foreground">{host}</span>}
      </TableCell>
      <TableCell className="w-[1%] text-right text-sm whitespace-nowrap text-foreground tabular-nums">
        {fullNumber(page.conversions)}
      </TableCell>
      <TableCell className="w-[1%] text-right text-sm whitespace-nowrap text-muted-foreground tabular-nums">
        {page.transactionTotal ? amount(page.transactionTotal) : "—"}
      </TableCell>
    </TableRow>
  );
};

const HEAD = "text-xs text-muted-foreground";

/** The pages as a ruled table: the header names the columns once, and the numbers line up. */
const PagesTable = ({ pages, site }: { pages: Page[]; site: string }): ReactNode => (
  <Table className="mt-1">
    <TableHeader className="[&_th]:border-b [&_th]:border-border">
      <TableRow>
        <TableHead className={HEAD}>Page</TableHead>
        <TableHead className={cn(HEAD, "text-right")}>Conversions</TableHead>
        <TableHead className={cn(HEAD, "text-right")}>Total</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {pages.map((page) => (
        <PageRow key={page.pageUrl} page={page} site={site} />
      ))}
    </TableBody>
  </Table>
);

const PagesNote = ({ truncated, grouped }: { truncated: boolean; grouped: boolean }): ReactNode => (
  <Fine className="mt-2.5">
    Counts transactions and sign-ups together.
    {grouped ? " Pages that differ only by an order number or another ID are counted as one." : ""}
    {truncated ? " Only the 250 busiest pages are listed." : ""}
  </Fine>
);

/** Where the conversions happened. Transactions and sign-ups arrive counted together. */
const Pages = ({ pages, truncated, site }: { pages: Page[]; truncated: boolean; site: string }): ReactNode => {
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState("");
  const { shown, canFilter, canShowAll, grouped } = pageListing(pages, all, filter);

  return (
    <>
      {canFilter && (
        <Input
          className="mt-1 mb-1.5"
          type="search"
          placeholder="Filter pages"
          aria-label="Filter pages"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      {shown.length === 0 ? (
        <Empty>No page matches “{filter.trim()}”.</Empty>
      ) : (
        <PagesTable pages={shown} site={site} />
      )}
      {canShowAll && (
        <Button type="button" variant="link" size="none" className="mt-2 text-md" onClick={() => setAll(true)}>
          Show all {pages.length} pages
        </Button>
      )}
      <PagesNote truncated={truncated} grouped={grouped} />
    </>
  );
};

const pagesBody = (result: Answered, site: string): ReactNode => {
  if (result.pages === null) return <Empty>The page list couldn’t load. Refresh to try again.</Empty>;
  if (result.pages.length === 0) {
    return <Empty>No transactions or sign-ups were recorded on any page in the last 7 days.</Empty>;
  }
  return <Pages pages={result.pages} truncated={result.truncated} site={site} />;
};

const PagesSection = ({ result, site }: { result: Answered; site: string }): ReactNode => (
  <SheetGroup title="Conversions by page">{pagesBody(result, site)}</SheetGroup>
);

const lastSeen = (label: string, at: string | null): string =>
  at ? `Last ${label}: ${when(at)}.` : `No ${label} in the last 7 days.`;

/** The two figures that only exist once there is money or ad traffic to count. */
const moneyEntries = (totals: Answered["totals"]): [string, string][] => {
  const entries: [string, string][] = [];
  if (totals.transactionTotal > 0) entries.push(["Transaction total", amount(totals.transactionTotal)]);
  if (totals.impressions > 0) entries.push(["Ad impressions", fullNumber(totals.impressions)]);
  return entries;
};

/** Each figure beside its name on one line, the way the counts above are read. */
const Money = ({ entries }: { entries: [string, string][] }): ReactNode =>
  entries.length > 0 ? (
    <dl className="mt-2.5 mb-0 flex flex-wrap gap-x-4 gap-y-0.5 text-sm tabular-nums">
      {entries.map(([label, value]) => (
        <div key={label} className="flex gap-1.5">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="m-0 text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  ) : null;

const LAST = "mb-0 text-sm leading-[1.5] text-muted-foreground";

/** The counts in full, then what only exists once there is money, then when the last events were. */
const Facts = ({ result }: { result: Answered }): ReactNode => (
  <>
    <TagCounts totals={result.totals} format={fullNumber} />
    <Money entries={moneyEntries(result.totals)} />
    <p className={cn(LAST, "mt-2.5")}>{lastSeen("transaction", result.lastTransactionAt)}</p>
    <p className={cn(LAST, "mt-0.5")}>{lastSeen("sign-up", result.lastSignUpAt)}</p>
  </>
);

/** A tag that could not be read gets a notice, with the service's own words behind its ⓘ. */
const Unread = ({ message, onRetry }: { message: string; onRetry(): void }): ReactNode => (
  <Alert tone="warn" role="note" className="m-0">
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      This tag’s activity couldn’t be read just now.{" "}
      <Button type="button" variant="link" size="none" onClick={onRetry}>
        Try again
      </Button>
      <InfoTip label="What the service said">{message}</InfoTip>
    </p>
  </Alert>
);

interface SheetProps {
  result: TagActivity;
  description: string;
  site: string;
  /** The last sheet tears off at the bottom, the way the stack's last sheet does. */
  last: boolean;
  onRetry(): void;
}

/** One tag's sheet: which tag, then its record in reading order. */
const Sheet = ({ result, description, site, last, onRetry }: SheetProps): ReactNode => {
  const headingId = `mj-activity-tag-${result.appId}`;
  return (
    <section
      className={cn("mb-2 bg-sheet px-5 pt-4 pb-[18px] shadow-press", last && "tear-bottom")}
      aria-labelledby={headingId}
    >
      <TagHeading id={headingId} appId={result.appId} description={description} />
      {result.status === "ok" ? (
        <>
          <Facts result={result} />
          <DaysSection daily={result.daily} />
          <PagesSection result={result} site={site} />
        </>
      ) : (
        <Unread message={result.message} onRetry={onRetry} />
      )}
    </section>
  );
};

/** Every tag's sheet, the last torn off like the stack's. */
const sheetsFor = (activity: TagActivityState, site: string): ReactNode =>
  activity.results.map((result, index) => (
    <Sheet
      key={result.appId}
      result={result}
      description={describeTag(activity.tags.find((tag) => tag.appId === result.appId))}
      site={site}
      last={index === activity.results.length - 1}
      onRetry={activity.refresh}
    />
  ));

/** One sheet for a sentence: what the view says while there is nothing to print in full. */
const Quiet = ({ children }: { children: ReactNode }): ReactNode => (
  <div className="bg-sheet px-5 pt-3 pb-[18px] shadow-press tear-bottom">{children}</div>
);

const bodyFor = (activity: TagActivityState, site: string): ReactNode => {
  if (activity.phase === "ready") return sheetsFor(activity, site);
  if (activity.phase === "error")
    return (
      <Quiet>
        <Failure activity={activity} />
      </Quiet>
    );
  const note = quietNote(activity);
  if (note)
    return (
      <Quiet>
        <Note>{note}</Note>
      </Quiet>
    );
  return (
    <Quiet>
      <TallySettling readings={settlingRows(activity)} />
    </Quiet>
  );
};

export const AnalyticsView = ({ activity, site }: { activity: TagActivityState; site: string }): ReactNode => (
  <Stack>
    <section
      data-slot="analytics"
      className="pb-5"
      aria-labelledby="mj-analytics-title"
      aria-busy={activity.refreshing}
    >
      <div className="flex items-baseline justify-between gap-3 px-5 pt-[18px] pb-3">
        <h2
          id="mj-analytics-title"
          tabIndex={-1}
          className="m-0 w-fit font-display text-xl font-semibold text-foreground"
        >
          Tag activity
        </h2>
        {activity.phase === "ready" && (
          <Button type="button" variant="link" size="none" className="text-md" onClick={activity.refresh}>
            Refresh
          </Button>
        )}
      </div>
      {bodyFor(activity, site)}
    </section>
  </Stack>
);
