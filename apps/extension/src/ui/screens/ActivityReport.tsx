import { ReactNode, useEffect, useRef, useState } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";

import { cn } from "~/lib/utils";
import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { amount, fullNumber, pageLabel, pageListing, stateLabel, when } from "~/ui/activity";
import { Definitions } from "~/ui/components/Definitions";
import InfoTip from "~/ui/components/InfoTip";
import { Empty, Fine } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";
import { Input } from "~/ui/components/ui/input";
import { DaysSection } from "~/ui/screens/ActivityDays";
import { ACTIVITY_DETAILS_ID, ACTIVITY_REPORT_ID, ACTIVITY_RETRY_ID } from "~/ui/screens/ActivityTally";

/**
 * Details: the whole of each tag's last 7 days, one sheet per tag, in the place the job's steps
 * usually are — the same way Settings takes it — so a long page list gets the panel's full height
 * and the job is untouched underneath.
 *
 * This is where the machine facts live that the tally keeps off the heading: the full app ID, the
 * tag's environment and version, the transaction total, and the pages the conversions happened on.
 */

type Answered = Extract<TagActivity, { status: "ok" }>;
type Page = NonNullable<Answered["pages"]>[number];

const conversions = (page: Page): string =>
  `${fullNumber(page.conversions)} ${page.conversions === 1 ? "conversion" : "conversions"}${
    page.transactionTotal ? ` · ${amount(page.transactionTotal)} total` : ""
  }`;

/** A page: its path in mono, its count, and — an off-site checkout — its host under the path. */
const PageRow = ({ page, site }: { page: Page; site: string }): ReactNode => {
  const { path, host } = pageLabel(page.pageUrl, site);
  return (
    <li className="flex flex-wrap items-baseline gap-x-2.5 py-1.5">
      <span className="min-w-0 flex-1 font-mono text-sm text-foreground wrap-anywhere">{path}</span>
      {host && <span className="order-3 flex-[1_0_100%] text-xs text-muted-foreground">{host}</span>}
      <span className="flex-none text-sm text-muted-foreground tabular-nums">{conversions(page)}</span>
    </li>
  );
};

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
        <ul className="m-0 list-none p-0">
          {shown.map((page) => (
            <PageRow key={page.pageUrl} page={page} site={site} />
          ))}
        </ul>
      )}
      {canShowAll && (
        <Button type="button" variant="link" size="none" className="mt-1 text-md" onClick={() => setAll(true)}>
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
  <div className="mt-[18px]">
    <h4 className="mt-0 mb-1 font-display text-base font-semibold text-foreground">Conversions by page</h4>
    {pagesBody(result, site)}
  </div>
);

const lastSeen = (label: string, at: string | null): string =>
  at ? `Last ${label}: ${when(at)}.` : `No ${label} in the last 7 days.`;

/** The counts, and the two that only exist once there is money or ad traffic to count. */
const factEntries = (totals: Answered["totals"]): [string, string][] => {
  const entries: [string, string][] = [
    ["Page views", fullNumber(totals.pageviews)],
    ["Transactions", fullNumber(totals.transactions)],
    ["Sign-ups", fullNumber(totals.signups)],
    ["Sessions", fullNumber(totals.sessions)],
  ];
  if (totals.transactionTotal > 0) entries.push(["Transaction total", amount(totals.transactionTotal)]);
  if (totals.impressions > 0) entries.push(["Ad impressions", fullNumber(totals.impressions)]);
  return entries;
};

const LAST = "mt-2 mb-0 text-base leading-[1.5] text-muted-foreground [&+&]:mt-0.5";

const Facts = ({ result }: { result: Answered }): ReactNode => (
  <>
    <Definitions entries={factEntries(result.totals)} />
    <p className={LAST}>{lastSeen("transaction", result.lastTransactionAt)}</p>
    <p className={LAST}>{lastSeen("sign-up", result.lastSignUpAt)}</p>
  </>
);

const describeTag = (tag: TagRecord | undefined): string => {
  if (!tag) return "";
  // Known only from the events it sends, or from Snowplow: nothing on the page names its configuration.
  const configuration = tag.environment
    ? `Environment ${tag.environment} · version ${tag.version}`
    : "Nothing on the page names this tag’s configuration";
  return `${configuration} · ${stateLabel(tag.state)}`;
};

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
  tag?: TagRecord;
  site: string;
  /** The last sheet tears off at the bottom, the way the stack's last sheet does. */
  last: boolean;
  onRetry(): void;
}

/** One tag's sheet: the full app id in mono, its configuration and state, then the record. */
const Sheet = ({ result, tag, site, last, onRetry }: SheetProps): ReactNode => {
  const headingId = `mj-activity-tag-${result.appId}`;
  return (
    <section
      className={cn("mb-2 bg-sheet px-5 pt-4 pb-[18px] shadow-press", last && "tear-bottom")}
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="m-0 font-mono text-sm leading-[1.45] font-normal text-foreground wrap-anywhere">
        {result.appId}
      </h3>
      <p className="mt-0.5 mb-3 text-sm leading-[1.45] text-muted-foreground">{describeTag(tag)}</p>
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
      <div className="px-5 pt-[18px] pb-3.5">
        <h2
          id="mj-report-title"
          ref={heading}
          tabIndex={-1}
          className="m-0 w-fit font-display text-xl font-semibold text-foreground"
        >
          Tag activity
        </h2>
        <p className="mt-1 mb-0 text-md leading-[1.5] text-muted-foreground">
          The last 7 days of every MediaJel tag on this page. Counts trail the site by up to an hour.{" "}
          <Button type="button" variant="link" size="none" onClick={activity.refresh}>
            Refresh
          </Button>
        </p>
      </div>
      {activity.results.map((result, index) => (
        <Sheet
          key={result.appId}
          result={result}
          tag={activity.tags.find((tag) => tag.appId === result.appId)}
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
