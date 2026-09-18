import { ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";
import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { amount, describeTag, fullNumber, pageLabel, pageListing, when } from "~/ui/activity";
import InfoTip from "~/ui/components/InfoTip";
import { Empty, Fine, SheetGroup } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";
import { Input } from "~/ui/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/ui/components/ui/table";
import { DaysSection } from "~/ui/screens/ActivityDays";
import { TagCounts, TagHeading } from "~/ui/screens/ActivityReading";
import { ACTIVITY_DETAILS_ID, ACTIVITY_REPORT_ID, ACTIVITY_RETRY_ID } from "~/ui/screens/ActivityTally";

/**
 * Details: the whole of each tag's last 7 days, one sheet per tag, in the place the job's steps
 * usually are — the same way Settings takes it — so a long page list gets the panel's full height
 * and the job is untouched underneath. The tally's readings step aside while it is open: every one
 * of them is here in full.
 *
 * A sheet reads top to bottom in one order: which tag, its counts in the tally's form but in full,
 * the money and the last events, then the days, then the pages the conversions happened on.
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

/**
 * When Details closes without the reader asking — a refresh that failed takes its readings away —
 * focus must not fall to the page body: it goes to the tally's Try again, or its Details button.
 */
const keepFocusOnTheTally = (): void => {
  if (document.activeElement && document.activeElement !== document.body) return;
  (document.getElementById(ACTIVITY_RETRY_ID) ?? document.getElementById(ACTIVITY_DETAILS_ID))?.focus();
};

export const ActivityReport = ({ activity, site }: { activity: TagActivityState; site: string }): ReactNode => {
  const heading = useRef<HTMLHeadingElement>(null);

  // Opening Details moves the reader to it; closing it hands focus back to the tally.
  useEffect(() => {
    heading.current?.focus();
    return keepFocusOnTheTally;
  }, []);
  const close = (): void => {
    activity.closeReport();
    document.getElementById(ACTIVITY_DETAILS_ID)?.focus();
  };

  return (
    <section id={ACTIVITY_REPORT_ID} className="pb-5" aria-labelledby="mj-report-title" aria-busy={activity.refreshing}>
      <div className="flex items-baseline justify-between gap-3 px-5 pt-[18px] pb-3">
        <h2
          id="mj-report-title"
          ref={heading}
          tabIndex={-1}
          className="m-0 w-fit font-display text-xl font-semibold text-foreground"
        >
          Tag activity
        </h2>
        <Button type="button" variant="link" size="none" className="text-md" onClick={activity.refresh}>
          Refresh
        </Button>
      </div>
      {activity.results.map((result, index) => (
        <Sheet
          key={result.appId}
          result={result}
          description={describeTag(activity.tags.find((tag) => tag.appId === result.appId))}
          site={site}
          last={index === activity.results.length - 1}
          onRetry={activity.refresh}
        />
      ))}
      <div className="flex justify-end px-5 pt-2">
        <Button type="button" variant="outline" onClick={close}>
          Back to the job
        </Button>
      </div>
    </section>
  );
};
