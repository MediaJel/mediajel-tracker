import { ReactNode } from "react";

import { cn } from "~/lib/utils";
import { JobSummary } from "~/store/jobs";
import { ActionBar } from "~/ui/components/ActionBar";
import { Letterhead } from "~/ui/components/Letterhead";
import { Panel, Stack } from "~/ui/components/Panel";
import Stamp from "~/ui/components/Stamp";
import { Button } from "~/ui/components/ui/button";
import { Close } from "~/ui/icons";

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

/** One line under the site: what the job is for, how much it holds, where it stands, when it was touched. */
const metaLine = (job: JobSummary): string =>
  `${job.goal === "transaction" ? "Transaction" : "Sign-up"} · ${job.events} events · ${
    STEP_LABELS[job.step] ?? job.step
  } · ${ago(job.touchedAt)}`;

/** A job: the site it is for, its one-line state, its stamp if it shipped, and the way to throw it away. */
const JobRow = ({
  job,
  current,
  onOpen,
  onDelete,
}: {
  job: JobSummary;
  /** The site you are standing on, marked the way a work order marks its live section. */
  current: boolean;
  onOpen(): void;
  onDelete(): void;
}): ReactNode => (
  <li
    className={cn("flex list-none items-center gap-2 border-t border-border pr-5", current && "bg-sheet shadow-press")}
  >
    <button
      type="button"
      className="flex min-w-0 flex-auto cursor-pointer flex-col gap-[3px] border-0 bg-transparent px-5 py-2.5 text-left"
      onClick={onOpen}
    >
      <span className="truncate font-display text-2xl text-foreground">{job.site}</span>
      <span className="text-xs text-muted-foreground">{metaLine(job)}</span>
    </button>
    <div className="flex flex-none items-center gap-1">
      {job.deployed ? <Stamp label="Deployed" tone="platform" filled /> : null}
      <Button
        variant="ghost"
        size="icon"
        className="size-[26px] hover:text-destructive [&_svg]:size-[13px]"
        aria-label={`Delete the job for ${job.site}`}
        title="Delete this job"
        onClick={onDelete}
      >
        <Close />
      </Button>
    </div>
  </li>
);

export interface JobsListProps {
  jobs: JobSummary[];
  currentSite: string;
  onOpen(site: string): void;
  onDelete(site: string): void;
  onBack(): void;
}

export const JobsList = ({ jobs, currentSite, onOpen, onDelete, onBack }: JobsListProps): ReactNode => (
  <Panel>
    <header className="flex-none px-5 pt-5 pb-4">
      <Letterhead title="Your jobs" />
    </header>

    <Stack list aria-label="Your jobs">
      {jobs.length === 0 ? (
        <li className="bg-sheet shadow-press">
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
          <JobRow
            key={job.site}
            job={job}
            current={job.site === currentSite}
            onOpen={() => onOpen(job.site)}
            onDelete={() => onDelete(job.site)}
          />
        ))
      )}
    </Stack>

    <ActionBar
      label="Back to this tab"
      consequence="Opening a job takes this tab to that site — recording and verify both need it."
      onClick={onBack}
    />
  </Panel>
);

export default JobsList;
