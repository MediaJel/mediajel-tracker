import { ReactNode, useEffect, useRef, useState } from "react";

import { TagSummary } from "@mediajel/assistant-core/context";

import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { amount, fullNumber, pageLabel, pageListing, when } from "~/ui/activity";
import InfoTip from "~/ui/components/InfoTip";
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
        <button type="button" className="mj-link mj-pages-more" onClick={() => setAll(true)}>
          Show all {pages.length} pages
        </button>
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

const Facts = ({ result }: { result: Answered }): ReactNode => {
  const { totals } = result;
  return (
    <>
      <dl className="mj-counts">
        <dt>Page views</dt>
        <dd>{fullNumber(totals.pageviews)}</dd>
        <dt>Transactions</dt>
        <dd>{fullNumber(totals.transactions)}</dd>
        <dt>Sign-ups</dt>
        <dd>{fullNumber(totals.signups)}</dd>
        <dt>Sessions</dt>
        <dd>{fullNumber(totals.sessions)}</dd>
        {totals.transactionTotal > 0 && (
          <>
            <dt>Transaction total</dt>
            <dd>{amount(totals.transactionTotal)}</dd>
          </>
        )}
        {totals.impressions > 0 && (
          <>
            <dt>Ad impressions</dt>
            <dd>{fullNumber(totals.impressions)}</dd>
          </>
        )}
      </dl>
      <p className="mj-report-last">{lastSeen("transaction", result.lastTransactionAt)}</p>
      <p className="mj-report-last">{lastSeen("sign-up", result.lastSignUpAt)}</p>
    </>
  );
};

const describeTag = (tag: TagSummary | undefined): string => {
  if (!tag) return "";
  // Heard sending events from this page, with no script tag to read the rest from.
  if (!tag.environment) return "Sending events from this page — no script tag on it names this tag";
  const held = tag.delayed ? " · held back by a page-speed plugin until the visitor interacts" : "";
  return `Environment ${tag.environment} · version ${tag.version}${held}`;
};

interface SheetProps {
  result: TagActivity;
  tag?: TagSummary;
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
          <PagesSection result={result} site={site} />
        </>
      ) : (
        <div className="mj-notice mj-notice--warn mj-report-unread" role="note">
          <p className="mj-inline-disclosure">
            This tag’s activity couldn’t be read just now.{" "}
            <button type="button" className="mj-link" onClick={onRetry}>
              Try again
            </button>
            <InfoTip label="What the service said">{result.message}</InfoTip>
          </p>
        </div>
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
          <button type="button" className="mj-link" onClick={activity.refresh}>
            Refresh
          </button>
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
        <button type="button" className="mj-btn mj-btn--ghost" onClick={close}>
          Back to the job
        </button>
      </div>
    </section>
  );
};
