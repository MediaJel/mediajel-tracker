import { ReactNode } from "react";

import Stamp from "~/ui/components/Stamp";
import { Close, Mark } from "~/ui/icons";
import { JobSummary } from "~/store/jobs";

/**
 * Every site you have worked on, most recent first.
 *
 * This screen is the reason the extension exists at all. The in-page widget kept its session
 * in the tab, so a job that was not finished in one sitting was a job that was lost; here a
 * recording, its generated tag and its deploy receipt sit in the browser until you throw them
 * away, and coming back to one is a click.
 */

const STEP_LABELS: Record<string, string> = {
  home: "not started",
  recording: "recording",
  review: "picking the event",
  generating: "generating",
  result: "code written",
  verify: "verifying",
  deploy: "ready to deploy",
  done: "deployed",
};

const ago = (at: number): string => {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export interface JobsListProps {
  jobs: JobSummary[];
  currentSite: string;
  onOpen(site: string): void;
  onDelete(site: string): void;
  onBack(): void;
}

export const JobsList = ({ jobs, currentSite, onOpen, onDelete, onBack }: JobsListProps): ReactNode => (
  <div className="mj-panel">
    <header className="mj-header">
      <div className="mj-letterhead">
        <Mark className="mj-mark" />
        <span className="mj-wordmark">MediaJel</span>
        <span className="mj-letterhead-rule" />
        <span className="mj-doc-title">Your jobs</span>
      </div>
    </header>

    <ol className="mj-stack mj-jobs">
      {jobs.length === 0 ? (
        <li className="mj-sheet">
          <div className="mj-section-body">
            <p className="mj-lede">No jobs yet.</p>
            <p className="mj-fine">
              Open a client’s site and start recording. The job is saved here as you go, so you can leave it half
              finished and come back tomorrow.
            </p>
          </div>
        </li>
      ) : (
        jobs.map((job) => (
          <li key={job.site} className={job.site === currentSite ? "mj-job mj-job--current" : "mj-job"}>
            <button type="button" className="mj-job-row" onClick={() => onOpen(job.site)}>
              <span className="mj-job-site">{job.site}</span>
              <span className="mj-job-meta">
                {job.goal === "transaction" ? "Transaction" : "Sign-up"} · {job.events} events ·{" "}
                {STEP_LABELS[job.step] ?? job.step} · {ago(job.touchedAt)}
              </span>
            </button>
            <div className="mj-job-side">
              {job.deployed ? <Stamp label="Deployed" tone="platform" filled /> : null}
              <button
                type="button"
                className="mj-icon-button mj-job-delete"
                aria-label={`Delete the job for ${job.site}`}
                title="Delete this job"
                onClick={() => onDelete(job.site)}
              >
                <Close />
              </button>
            </div>
          </li>
        ))
      )}
    </ol>

    <footer className="mj-actionbar">
      <button type="button" className="mj-btn mj-btn--primary mj-btn--wide" onClick={onBack}>
        Back to this tab
      </button>
      <p className="mj-consequence">Opening a job takes this tab to that site — recording and verify both need it.</p>
    </footer>
  </div>
);

export default JobsList;
