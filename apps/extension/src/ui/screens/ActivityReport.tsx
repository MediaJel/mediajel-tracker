import { ReactNode, useEffect, useRef, useState } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";

import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { amount, fullNumber, pageLabel, pageListing, stateLabel, when } from "~/ui/activity";
import { Definitions } from "~/ui/components/Definitions";
import InfoTip from "~/ui/components/InfoTip";
import { DaysSection } from "~/ui/screens/ActivityDays";
import { ACTIVITY_DETAILS_ID, ACTIVITY_REPORT_ID, ACTIVITY_RETRY_ID } from "~/ui/screens/ActivityTally";
import { Button } from "~/ui/components/ui/button";
import { Alert } from "~/ui/components/ui/alert";

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

const PageRow = ({ page, site }: { page: Page; site: string }): ReactNode => {
  const { path, host } = pageLabel(page.pageUrl, site);
  return (
    <li className="mj-page">
      <span className="mj-page-path">{path}</span>
      {host && <span className="mj-page-host">{host}</span>}
      <span className="mj-page-count">{conversions(page)}</span>
    </li>
  );
};

const PagesNote = ({ truncated, grouped }: { truncated: boolean; grouped: boolean }): ReactNode => (
  <p className="mj-fine mj-pages-note">
    Counts transactions and sign-ups together.
    {grouped ? " Pages that differ only by an order number or another ID are counted as one." : ""}
    {truncated ? " Only the 250 busiest pages are listed." : ""}
  </p>
);

/** Where the conversions happened. Transactions and sign-ups arrive counted together. */
const Pages = ({ pages, truncated, site }: { pages: Page[]; truncated: boolean; site: string }): ReactNode => {
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState("");
  const { shown, canFilter, canShowAll, grouped } = pageListing(pages, all, filter);

  return (
    <>
      {canFilter && (
        <input
          className="mj-input mj-pages-filter"
          type="search"
          placeholder="Filter pages"
          aria-label="Filter pages"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      {shown.length === 0 ? (
        <p className="mj-empty">No page matches “{filter.trim()}”.</p>
      ) : (
        <ul className="mj-pages-list">
          {shown.map((page) => (
            <PageRow key={page.pageUrl} page={page} site={site} />
          ))}
        </ul>
      )}
      {canShowAll && (
        <Button type="button" variant="link" size="none" className="mj-pages-more" onClick={() => setAll(true)}>
          Show all {pages.length} pages
        </Button>
      )}
      <PagesNote truncated={truncated} grouped={grouped} />
    </>
  );
};

const PagesSection = ({ result, site }: { result: Answered; site: string }): ReactNode => (
  <div className="mj-pages">
    <h4 className="mj-pages-title">Conversions by page</h4>
    {result.pages === null ? (
      <p className="mj-empty">The page list couldn’t load. Refresh to try again.</p>
    ) : result.pages.length === 0 ? (
      <p className="mj-empty">No transactions or sign-ups were recorded on any page in the last 7 days.</p>
    ) : (
      <Pages pages={result.pages} truncated={result.truncated} site={site} />
    )}
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

const Facts = ({ result }: { result: Answered }): ReactNode => (
  <>
    <Definitions entries={factEntries(result.totals)} />
    <p className="mj-report-last">{lastSeen("transaction", result.lastTransactionAt)}</p>
    <p className="mj-report-last">{lastSeen("sign-up", result.lastSignUpAt)}</p>
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

interface SheetProps {
  result: TagActivity;
  tag?: TagRecord;
  site: string;
  /** The last sheet tears off at the bottom, the way the stack's last sheet does. */
  last: boolean;
  onRetry(): void;
}

const Sheet = ({ result, tag, site, last, onRetry }: SheetProps): ReactNode => {
  const headingId = `mj-activity-tag-${result.appId}`;
  return (
    <section className={last ? "mj-report-sheet mj-report-sheet--last" : "mj-report-sheet"} aria-labelledby={headingId}>
      <h3 id={headingId} className="mj-report-tag">
        {result.appId}
      </h3>
      <p className="mj-report-tag-meta">{describeTag(tag)}</p>
      {result.status === "ok" ? (
        <>
          <Facts result={result} />
          <DaysSection daily={result.daily} />
          <PagesSection result={result} site={site} />
        </>
      ) : (
        <Alert tone="warn" role="note" className="mb-3 mj-report-unread">
          <p className="mj-inline-disclosure">
            This tag’s activity couldn’t be read just now.{" "}
            <Button type="button" variant="link" size="none" onClick={onRetry}>
              Try again
            </Button>
            <InfoTip label="What the service said">{result.message}</InfoTip>
          </p>
        </Alert>
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
    <section
      id={ACTIVITY_REPORT_ID}
      className="mj-report"
      aria-labelledby="mj-report-title"
      aria-busy={activity.refreshing}
    >
      <div className="mj-report-intro">
        <h2 id="mj-report-title" ref={heading} tabIndex={-1} className="mj-report-title">
          Tag activity
        </h2>
        <p className="mj-report-lede">
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
      <div className="mj-report-footer">
        <Button type="button" variant="outline" onClick={close}>
          Back to the job
        </Button>
      </div>
    </section>
  );
};
