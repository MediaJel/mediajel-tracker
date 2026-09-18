/*
THESIS: One integration job sheet per site, kept as carbon copies — every finished step seals into a stamped slip that stays readable above the live work, and the next action is always in the same place at the bottom; it refuses the wizard-with-progress-dots and the chat transcript.
OWN-WORLD: MediaJel paper (#E6E9EB ground, white sheet; ink ground in dark), Avenir Next ink, SF Mono figures; identity blue is the live ink and the carbon impression, platform green the VERIFIED/DEPLOYED stamp, partner orange warnings, privacy purple anything that leaves the browser; the MJ zigzag as the rule; numbered sections 01–05; hairlines #C7CDD3; stamps tilted 4°.
STORY: I see which site I am on and who I am, watch evidence accumulate, get code with an honest field checklist, prove it on this page, ship it — and the receipt for every step stays stacked above me.
FIRST VIEWPORT: a full-height side panel: letterhead (mark, MEDIAJEL, signed-in name, jobs, gear), Site / App / Tag rows, the zigzag rule, then the carbon stack — finished steps as tinted stamped slips, the live step as the full sheet at the bottom — under a pinned action bar naming the one next action and what it will do.
FORM: Carbon-copy stack, #3 of 7 ordered structures, seed ea35aae4 (surface/operate).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/

import { ReactNode } from "react";

import type { Identity } from "~/auth/cognito";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { Settings } from "~/store/settings";
import { Letterhead } from "~/ui/components/Letterhead";
import { Panel, Stack } from "~/ui/components/Panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "~/ui/components/ui/alert-dialog";
import { Button } from "~/ui/components/ui/button";
import { JOB_TITLES } from "~/ui/contract";
import { Gear, Person, Restart, Zigzag } from "~/ui/icons";
import { ActivityReport } from "~/ui/screens/ActivityReport";
import { ActivityTally } from "~/ui/screens/ActivityTally";
import SettingsOverlay from "~/ui/screens/SettingsOverlay";
import { SetupView, SetupViewProps } from "~/ui/screens/SetupView";

/**
 * The panel.
 *
 * Everything above the zigzag is the work order's heading: the letterhead, the job's name, who
 * is signed in, the tally. Under it, one of three bodies: the job's carbon stack with its pinned
 * action (the setup view), the activity report, or Settings — the last two take the stack's
 * place rather than covering it, so the panel is always one sheet.
 */

export interface AppProps extends SetupViewProps {
  /** The hostname the panel is bound to — the job's identity and the deploy file's name. */
  site: string;
  /** The last 7 days of every MediaJel tag on the page. */
  activity: TagActivityState;
  settings: Settings;
  confirmingReset: boolean;
  access: { status: "idle" | "checking" | "ok" | "error"; message: string };
  settingsOpen: boolean;
  onCloseSettings(): void;
  /** The tag URL "load the tag on this page" would use. */
  tagUrl: string;
}

type HeadingProps = Pick<
  AppProps,
  "site" | "session" | "identity" | "activity" | "handlers" | "settingsOpen" | "onOpenSettings" | "onCloseSettings"
>;

/** The letterhead's two controls: start over (once there is something to throw away) and Settings. */
const HeaderControls = ({ session, handlers, settingsOpen, onOpenSettings, onCloseSettings }: HeadingProps) => (
  <>
    {session.step !== "home" && (
      <Button variant="ghost" size="icon" aria-label="Start over" title="Start over" onClick={handlers.onRequestReset}>
        <Restart />
      </Button>
    )}
    <Button
      variant="ghost"
      size="icon"
      aria-label={settingsOpen ? "Close settings" : "Settings"}
      onClick={settingsOpen ? onCloseSettings : onOpenSettings}
    >
      <Gear />
    </Button>
  </>
);

/** Who is signed in, and the way back to the job list — the question you ask right after it. */
const Who = ({ identity, onOpenJobs }: { identity: Identity | null; onOpenJobs(): void }): ReactNode => (
  <Button variant="secondary" size="pill" onClick={onOpenJobs} title="Your jobs">
    <Person />
    {identity ? identity.name || identity.username : "Signed out"}
  </Button>
);

/** Everything above the zigzag: the letterhead and its controls, the job's name, who is signed in, the tally. */
const Heading = (props: HeadingProps): ReactNode => (
  <header className="flex-none px-5 pt-5 pb-4">
    <Letterhead title="Work order">
      <HeaderControls {...props} />
    </Letterhead>

    {/* The job's own name, said once and properly. The app id and the file it will become are
        machine facts, and they wait in Settings and in the Deploy step where they matter. */}
    <h1 className="mt-[18px] mb-0 font-display text-title font-normal tracking-[-0.015em] text-foreground wrap-anywhere">
      {props.site}
    </h1>
    <p className="mt-[7px] mb-0 flex flex-wrap items-baseline gap-1.5 text-base text-muted-foreground">
      <span>{JOB_TITLES[props.session.goal]}</span>
      <span className="text-ink-faint" aria-hidden="true">
        ·
      </span>
      <Who identity={props.identity} onOpenJobs={props.handlers.onOpenJobs} />
    </p>

    <ActivityTally activity={props.activity} goal={props.session.goal} />
  </header>
);

/** The one irreversible thing the panel offers, asked as a slip laid across the top of the sheet. */
const ConfirmReset = ({
  open,
  hasCode,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  hasCode: boolean;
  onCancel(): void;
  onConfirm(): void;
}): ReactNode => (
  <AlertDialog open={open} onOpenChange={(next) => (next ? undefined : onCancel())}>
    <AlertDialogContent>
      <AlertDialogTitle>Start over?</AlertDialogTitle>
      <AlertDialogDescription>
        Throw away this recording{hasCode ? ", the generated code" : ""} and start over? Your other jobs are kept.
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep working</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Start over</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/** What fills the panel under the zigzag: the report, Settings, or the job’s stack and its action. */
const Body = (props: AppProps): ReactNode => {
  const { activity, settingsOpen, site } = props;
  if (activity.reportOpen && activity.phase === "ready") {
    return (
      <Stack>
        <ActivityReport activity={activity} site={site} />
      </Stack>
    );
  }
  if (settingsOpen) {
    return (
      <Stack>
        <SettingsOverlay
          identity={props.identity}
          settings={props.settings}
          appId={props.status.appId}
          access={props.access}
          tagUrl={props.tagUrl}
          onCheckAccess={props.handlers.onCheckAccess}
          onPatch={props.handlers.onSettingsPatch}
          onSignOut={props.handlers.onSignOut}
          onClearDedup={props.handlers.onClearDedup}
          onInjectTag={props.handlers.onInjectTag}
          onClearAllJobs={props.handlers.onClearAllJobs}
          onClose={props.onCloseSettings}
        />
      </Stack>
    );
  }
  return <SetupView {...props} />;
};

export const App = (props: AppProps): ReactNode => (
  <Panel>
    <Heading {...props} />
    <Zigzag live={props.session.step === "recording"} />
    <ConfirmReset
      open={props.confirmingReset}
      hasCode={Boolean(props.session.generation)}
      onCancel={props.handlers.onCancelReset}
      onConfirm={props.handlers.onConfirmReset}
    />
    <Body {...props} />
  </Panel>
);

export default App;
