import { ReactNode, useEffect, useRef, useState } from "react";

import { TagSummary } from "@mediajel/assistant-core/context";

import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { dollars, fullNumber, pageLabel, pageListing, when } from "~/ui/activity";
import InfoTip from "~/ui/components/InfoTip";
import { ACTIVITY_DETAILS_ID, ACTIVITY_REPORT_ID } from "~/ui/screens/ActivityTally";

/**
 * Details: the whole of each tag's last 7 days, one sheet per tag, in the place the job's steps
 * usually are — the same way Settings takes it — so a long page list gets the panel's full height
 * and the job is untouched underneath.
 *
 * This is where the machine facts live that the tally keeps off the heading: the full app ID, the
 * tag's environment and version, the money, and the pages the conversions happened on.
 */

type Answered = Extract<TagActivity, { status: "ok" }>;
type Page = NonNullable<Answered["pages"]>[number];

const conversions = (page: Page): string =>
  `${fullNumber(page.conversions)} ${page.conversions === 1 ? "conversion" : "conversions"}${
    page.transactionTotal ? ` · ${dollars(page.transactionTotal)}` : ""
  }`;

const PageRow = ({ page, site }: { page: Page; site: string }): ReactNode => {
  const { path, host, href } = pageLabel(page.pageUrl, site);
  const content = (
    <>
      <span className="mj-page-path">{path}</span>
      {host && <span className="mj-page-host">{host}</span>}
      <span className="mj-page-count">{conversions(page)}</span>
    </>
  );
  return (
    <li>
      {href ? (
        <a className="mj-page mj-page--link" href={href} target="_blank" rel="noreferrer">
          {content}
        </a>
      ) : (
        <span className="mj-page">{content}</span>
      )}
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
      <ul className="mj-pages-list">
        {shown.map((page) => (
          <PageRow key={page.pageUrl} page={page} site={site} />
        ))}
      </ul>
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
        <dt>Sessions</dt>
        <dd>{fullNumber(totals.sessions)}</dd>
        <dt>Transactions</dt>
        <dd>{fullNumber(totals.transactions)}</dd>
        <dt>Sign-ups</dt>
        <dd>{fullNumber(totals.signups)}</dd>
        {totals.transactionTotal > 0 && (
          <>
            <dt>Total</dt>
            <dd>{dollars(totals.transactionTotal)}</dd>
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
  const held = tag.delayed ? " · held back by a page-speed plugin until the visitor interacts" : "";
  return `Environment ${tag.environment} · version ${tag.version}${held}`;
};

const Sheet = (props: { result: TagActivity; tag?: TagSummary; site: string; onRetry(): void }): ReactNode => {
  const { result, tag, site, onRetry } = props;
  const headingId = `mj-activity-tag-${result.appId}`;
  return (
    <section className="mj-report-sheet" aria-labelledby={headingId}>
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

export const ActivityReport = ({ activity, site }: { activity: TagActivityState; site: string }): ReactNode => {
  const heading = useRef<HTMLHeadingElement>(null);

  // Opening Details moves the reader to it; closing it hands focus back to the button that opened it.
  useEffect(() => heading.current?.focus(), []);
  const close = (): void => {
    activity.closeReport();
    document.getElementById(ACTIVITY_DETAILS_ID)?.focus();
  };

  return (
    <div
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
      {activity.results.map((result) => (
        <Sheet
          key={result.appId}
          result={result}
          tag={activity.tags.find((tag) => tag.appId === result.appId)}
          site={site}
          onRetry={activity.refresh}
        />
      ))}
      <div className="mj-report-footer">
        <button type="button" className="mj-btn mj-btn--ghost" onClick={close}>
          Back to the job
        </button>
      </div>
    </div>
  );
};
