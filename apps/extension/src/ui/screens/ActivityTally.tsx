import { ReactNode } from "react";

import { WidgetGoal } from "@mediajel/assistant-core/types";

import type { TagActivity } from "~/service/client";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { shortAppId, tallyNumber, tallySentence } from "~/ui/activity";
import InfoTip from "~/ui/components/InfoTip";
import { ChevronDown } from "~/ui/icons";

/**
 * The tally: what MediaJel has recorded from this site's tags over the last 7 days, printed on the
 * work order under the job's name.
 *
 * It sits in the heading rather than in the stack because it is a fact about the site, like the
 * title — it is true before the job starts and it is where the first real conversions show up
 * after Deploy — so it never scrolls away. It is a reading, not a dashboard: one row per tag, the
 * column names printed once, and a sentence only when there is something to say.
 */

export const ACTIVITY_REPORT_ID = "mj-activity-report";
export const ACTIVITY_DETAILS_ID = "mj-activity-details";
export const ACTIVITY_RETRY_ID = "mj-activity-retry";

type Props = { activity: TagActivityState; goal: WidgetGoal };

const COLUMNS = [
  { key: "pageviews", label: "Page views" },
  { key: "transactions", label: "Transactions" },
  { key: "signups", label: "Sign-ups" },
  { key: "sessions", label: "Sessions" },
] as const;

/** More rows than this and the heading stops being a heading; the rest are in Details. */
const MAX_ROWS = 3;

const Values = ({ result }: { result: Extract<TagActivity, { status: "ok" }> }): ReactNode =>
  COLUMNS.map(({ key }) => (
    <td key={key} className={result.totals[key] === 0 ? "mj-tally-value mj-tally-zero" : "mj-tally-value"}>
      {tallyNumber(result.totals[key])}
    </td>
  ));

const Unread = ({ onRetry }: { onRetry(): void }): ReactNode => (
  <td colSpan={COLUMNS.length} className="mj-tally-unread">
    Couldn’t load.{" "}
    <button type="button" className="mj-link" onClick={onRetry}>
      Try again
    </button>
  </td>
);

const Row = ({ result, many, onRetry }: { result: TagActivity; many: boolean; onRetry(): void }): ReactNode => (
  <tr>
    {many && (
      <th scope="row" className="mj-tally-id" title={result.appId}>
        {shortAppId(result.appId)}
      </th>
    )}
    {result.status === "ok" ? <Values result={result} /> : <Unread onRetry={onRetry} />}
  </tr>
);

const ColumnNames = ({ many }: { many: boolean }): ReactNode => (
  <thead>
    <tr>
      {many && (
        <th scope="col" className="mj-tally-column mj-tally-id-column">
          <span className="mj-visually-hidden">Tag</span>
        </th>
      )}
      {COLUMNS.map(({ key, label }) => (
        <th key={key} scope="col" className="mj-tally-column">
          {label}
        </th>
      ))}
    </tr>
  </thead>
);

const gridClass = (many: boolean, stale: boolean): string =>
  ["mj-tally-grid", many && "mj-tally-grid--many", stale && "mj-tally-grid--stale"].filter(Boolean).join(" ");

const MoreTags = ({ hidden }: { hidden: number }): ReactNode =>
  hidden > 0 ? (
    <p className="mj-tally-note">{hidden === 1 ? "One more tag" : `${hidden} more tags`} in Details.</p>
  ) : null;

const Sentence = ({ text }: { text: string }): ReactNode => (text ? <p className="mj-tally-sentence">{text}</p> : null);

const Readings = ({ activity, goal }: Props): ReactNode => {
  const many = activity.results.length > 1;
  return (
    <>
      <table className={gridClass(many, activity.refreshing)}>
        <ColumnNames many={many} />
        <tbody>
          {activity.results.slice(0, MAX_ROWS).map((result) => (
            <Row key={result.appId} result={result} many={many} onRetry={activity.refresh} />
          ))}
        </tbody>
      </table>
      <MoreTags hidden={activity.results.length - MAX_ROWS} />
      <Sentence text={tallySentence(activity.results, goal)} />
    </>
  );
};

const Skeleton = ({ rows }: { rows: number }): ReactNode => (
  <div className="mj-tally-skeleton" aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => (
      <span key={index} className="mj-skeleton-bar mj-tally-skeleton-row" />
    ))}
  </div>
);

const Note = ({ children, problem = false }: { children: ReactNode; problem?: boolean }): ReactNode => (
  <p className={problem ? "mj-tally-note mj-tally-note--problem" : "mj-tally-note"}>{children}</p>
);

const Failure = ({ activity }: { activity: TagActivityState }): ReactNode => (
  <Note problem>
    {activity.error || "Tag activity couldn’t load."} That says nothing about whether the tags are firing.{" "}
    <button id={ACTIVITY_RETRY_ID} type="button" className="mj-link" onClick={activity.refresh}>
      Try again
    </button>
  </Note>
);

const QUIET: Partial<Record<TagActivityState["phase"], string>> = {
  listening: "Listening for this page’s tags…",
  "no-tags":
    "No MediaJel tag has announced itself or sent events from this page. Still listening: a tag that loads later, or one a page-speed plugin releases when you interact with the page, appears here on its own.",
  "not-configured": "Tag activity isn’t set up on the assistant service yet.",
};

/** What the tally says when there is nothing to read yet and no failure to report, if anything. */
const quietNote = (activity: TagActivityState): string | undefined => QUIET[activity.phase];

/** Everything the tally can say instead of its readings — each one a different fact, never zeros. */
const Body = ({ activity, goal }: Props): ReactNode => {
  if (activity.phase === "ready") return <Readings activity={activity} goal={goal} />;
  if (activity.phase === "error") return <Failure activity={activity} />;
  const note = quietNote(activity);
  return note ? <Note>{note}</Note> : <Skeleton rows={Math.min(Math.max(activity.tags.length, 1), MAX_ROWS)} />;
};

const DetailsToggle = ({ activity }: { activity: TagActivityState }): ReactNode => {
  const open = activity.reportOpen;
  return (
    <button
      id={ACTIVITY_DETAILS_ID}
      type="button"
      className="mj-tally-details"
      aria-expanded={open}
      aria-controls={open ? ACTIVITY_REPORT_ID : undefined}
      onClick={open ? activity.closeReport : activity.openReport}
    >
      Details
      <ChevronDown className={open ? "mj-chevron mj-chevron--up" : "mj-chevron"} />
    </button>
  );
};

export const ActivityTally = ({ activity, goal }: Props): ReactNode => (
  <section
    className="mj-tally"
    aria-labelledby="mj-tally-title"
    aria-busy={activity.phase === "loading" || activity.refreshing}
  >
    <div className="mj-inline-disclosure">
      <h2 id="mj-tally-title" className="mj-tally-title">
        Tag activity <span className="mj-tally-range">Last 7 days</span>
      </h2>
      <InfoTip label="What tag activity counts">
        <span className="mj-info-line">
          Each row is one MediaJel tag found on this page. Page views are page_view events; sessions are visits, split
          by 30 minutes without activity; transactions are purchases that carried an order id and a total; sign-ups are
          sign_up events or events carrying sign-up details.
        </span>
        <span className="mj-info-line">
          From MediaJel’s live tag activity, which keeps 7 days. Counts trail the site by up to an hour.
        </span>
        <span className="mj-info-line mj-info-line--privacy">
          To look this up, the assistant sends these tags’ app IDs to MediaJel — nothing from the page itself.
        </span>
      </InfoTip>
      {activity.phase === "ready" && <DetailsToggle activity={activity} />}
    </div>
    <Body activity={activity} goal={goal} />
  </section>
);
