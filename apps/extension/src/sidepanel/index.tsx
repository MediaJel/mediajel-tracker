import { ReactNode } from "react";

import App from "~/ui/App";
import SignIn from "~/ui/SignIn";
import JobsList from "~/ui/screens/JobsList";
import { Mark } from "~/ui/icons";
import { useTheme } from "~/ui/useTheme";
import { usePanel } from "~/sidepanel/usePanel";

import "~/ui/styles.css";

/**
 * The side panel: the assistant, whole.
 *
 * Five states, and each one is a real place rather than an empty version of the work order —
 * signing in, a tab with no site to work on, the job list, the job itself, and the moment
 * before we know which of those it is.
 */

const Frame = ({ children }: { children: ReactNode }): ReactNode => (
  <div className="mj-panel mj-panel--plain">
    <div className="mj-letterhead">
      <Mark className="mj-mark" />
      <span className="mj-wordmark">MediaJel</span>
      <span className="mj-letterhead-rule" />
      <span className="mj-doc-title">Integrations Assistant</span>
    </div>
    {children}
  </div>
);

export const SidePanel = (): ReactNode => {
  const panel = usePanel();
  useTheme(panel.settings.theme);

  if (panel.screen === "loading") {
    return (
      <Frame>
        <p className="mj-lede">Opening…</p>
      </Frame>
    );
  }

  if (panel.screen === "sign-in") {
    return (
      <div className="mj-panel mj-panel--plain">
        <SignIn
          challenge={panel.challenge}
          busy={panel.authBusy}
          error={panel.authError}
          onSignIn={panel.signIn}
          onAnswer={panel.answerChallenge}
        />
      </div>
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
          <button type="button" className="mj-btn mj-btn--ghost" onClick={panel.handlers.onOpenJobs}>
            Your jobs
          </button>
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
        <p className="mj-lede">Opening…</p>
      </Frame>
    );
  }

  return (
    <App
      site={panel.site}
      session={panel.session}
      status={panel.status}
      identity={panel.identity}
      settings={panel.settings}
      handlers={panel.handlers}
      flow={panel.flow}
      generateBlocked={panel.generateBlocked}
      expanded={panel.expanded}
      onToggleSlip={panel.onToggleSlip}
      confirmingReset={panel.confirmingReset}
      access={panel.access}
      settingsOpen={panel.settingsOpen}
      onOpenSettings={panel.onOpenSettings}
      onCloseSettings={panel.onCloseSettings}
      tagUrl={panel.tagUrl}
    />
  );
};

export default SidePanel;
