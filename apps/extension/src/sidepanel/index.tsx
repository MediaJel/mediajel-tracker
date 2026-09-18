import { ReactNode } from "react";

import App from "~/ui/App";
import SignIn from "~/ui/SignIn";
import JobsList from "~/ui/screens/JobsList";
import { useTheme } from "~/ui/useTheme";
import { usePanel } from "~/sidepanel/usePanel";

import "~/ui/globals.built.css";
import { Button } from "~/ui/components/ui/button";
import { Letterhead } from "~/ui/components/Letterhead";
import { Panel } from "~/ui/components/Panel";
import { Skeleton } from "~/ui/components/ui/skeleton";

/**
 * The side panel: the assistant, whole.
 *
 * Five states, and each one is a real place rather than an empty version of the work order —
 * signing in, a tab with no site to work on, the job list, the job itself, and the moment
 * before we know which of those it is.
 */

/**
 * The panel while it is finding out what it is looking at.
 *
 * A skeleton of the real layout rather than a line of text, because the alternative is the
 * panel appearing to be empty and then jumping — and because opening the side panel on a slow
 * tab is the operator's first impression of the product. The shapes are the ones that will be
 * there: a job title, the goal line, the tag activity reading, and the first two carbon slips.
 *
 * `aria-busy` and one polite label; the bars themselves are decorative and hidden, because a
 * screen reader announcing six empty boxes is worse than silence.
 */
const Settling = (): ReactNode => (
  <div className="flex flex-col gap-3.5 pt-5" aria-busy="true" aria-live="polite" aria-label="Opening this job">
    <Skeleton className="h-[26px] w-[62%]" />
    <Skeleton className="h-[13px] w-[84%]" />
    <Skeleton className="mj-skeleton-bar--tally" />
    <Skeleton className="h-[52px] shadow-press" />
    <Skeleton className="h-[52px] shadow-press" />
  </div>
);

const Frame = ({ children }: { children: ReactNode }): ReactNode => (
  <Panel plain>
    <Letterhead title="Integrations Assistant" />
    {children}
  </Panel>
);

export const SidePanel = (): ReactNode => {
  const panel = usePanel();
  useTheme(panel.settings.theme);

  if (panel.screen === "loading") {
    return (
      <Frame>
        <Settling />
      </Frame>
    );
  }

  if (panel.screen === "sign-in") {
    return (
      <Panel plain>
        <SignIn
          challenge={panel.challenge}
          busy={panel.authBusy}
          error={panel.authError}
          onSignIn={panel.signIn}
          onAnswer={panel.answerChallenge}
        />
      </Panel>
    );
  }

  if (panel.screen === "no-site") {
    return (
      <Frame>
        <p className="mj-lede">This tab is not on a website yet.</p>
        <p className="mj-fine">
          Open the client’s site in this tab and the work order for it appears here. Recording, verifying and deploying
          all happen against the real page, so there is nothing useful to show until there is one.
        </p>
        <div className="mj-section-footer">
          <Button type="button" variant="outline" onClick={panel.handlers.onOpenJobs}>
            Your jobs
          </Button>
        </div>
      </Frame>
    );
  }

  if (panel.screen === "jobs") {
    return (
      <JobsList
        jobs={panel.jobs}
        currentSite={panel.site}
        onOpen={panel.onOpenJob}
        onDelete={panel.onDeleteJob}
        onBack={panel.onBackToJob}
      />
    );
  }

  if (!panel.session) {
    return (
      <Frame>
        <Settling />
      </Frame>
    );
  }

  return (
    <App
      site={panel.site}
      session={panel.session}
      status={panel.status}
      activity={panel.activity}
      identity={panel.identity}
      settings={panel.settings}
      handlers={panel.handlers}
      flow={panel.flow}
      generateBlocked={panel.generateBlocked}
      expanded={panel.expanded}
      onToggleSlip={panel.onToggleSlip}
      confirmingReset={panel.confirmingReset}
      access={panel.access}
      pending={panel.pending}
      flowError={panel.flowError}
      settingsOpen={panel.settingsOpen}
      onOpenSettings={panel.onOpenSettings}
      onCloseSettings={panel.onCloseSettings}
      tagUrl={panel.tagUrl}
    />
  );
};

export default SidePanel;
