/*
THESIS: One integration job sheet per site, kept as carbon copies — every finished step seals into a stamped slip that stays readable above the live work, and the next action is always in the same place at the bottom; it refuses the wizard-with-progress-dots and the chat transcript.
OWN-WORLD: MediaJel paper (#E6E9EB ground, white sheet; ink ground in dark), Avenir Next ink, SF Mono figures; identity blue is the live ink and the carbon impression, platform green the VERIFIED/DEPLOYED stamp, partner orange warnings, privacy purple anything that leaves the browser; the MJ zigzag as the rule; numbered sections 01–05; hairlines #C7CDD3; stamps tilted 4°.
STORY: I see which site I am on and who I am, watch evidence accumulate, get code with an honest field checklist, prove it on this page, ship it — and the receipt for every step stays stacked above me.
FIRST VIEWPORT: a full-height side panel: letterhead (mark, MEDIAJEL, signed-in name, jobs, gear), Site / App / Tag rows, the zigzag rule, then the carbon stack — finished steps as tinted stamped slips, the live step as the full sheet at the bottom — under a pinned action bar naming the one next action and what it will do.
FORM: Carbon-copy stack, #3 of 7 ordered structures, seed ea35aae4 (surface/operate).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/

import { ReactNode } from "react";

import { TrackerStatus } from "@mediajel/assistant-core/tags";
import { WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/assistant-core/types";
import { InterceptedCall } from "@mediajel/assistant-core/verify/interceptor";
import { checkPayload } from "@mediajel/assistant-core/verify/payload-check";

import type { Identity } from "~/auth/cognito";
import type { Pending } from "~/sidepanel/usePanel";
import type { TagActivityState } from "~/sidepanel/useTagActivity";
import { Settings } from "~/store/settings";
import { ActionBar } from "~/ui/components/ActionBar";
import { Chevron } from "~/ui/components/Chevron";
import { Definitions } from "~/ui/components/Definitions";
import { Letterhead } from "~/ui/components/Letterhead";
import { Panel, Stack } from "~/ui/components/Panel";
import { Fine, SectionBody } from "~/ui/components/Section";
import Stamp from "~/ui/components/Stamp";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { Gear, Person, Restart, Zigzag } from "~/ui/icons";
import { ActivityReport } from "~/ui/screens/ActivityReport";
import { ActivityTally } from "~/ui/screens/ActivityTally";
import CodeSection from "~/ui/screens/CodeSection";
import DeploySection, { TargetState } from "~/ui/screens/DeploySection";
import EvidenceSection from "~/ui/screens/EvidenceSection";
import RecordSection from "~/ui/screens/RecordSection";
import SettingsOverlay from "~/ui/screens/SettingsOverlay";
import VerifySection from "~/ui/screens/VerifySection";
import { cn } from "~/lib/utils";

/**
 * The panel.
 *
 * The in-page widget was a 380px card that could only afford one open section at a time, so
 * finished work collapsed to a single stamped row and the rest went away. A side panel has the
 * height to keep everything, and the structure changes to use it: a finished step seals into a
 * carbon slip — its stamp, its one-line receipt, still openable in place — and the slips stack
 * upward while the live step sits at the bottom of the stack, nearest the action bar. The
 * scroll IS the record of the job.
 *
 * The action bar is the other half of that idea. In a document that scrolls, a primary button
 * living inside the current section moves every time the section changes size; pinned to the
 * bottom it is in one place all day, and it can afford to say what it is about to do.
 */

/** The five sections of the work order and the step(s) each one owns. */
export const SECTIONS: readonly { id: string; label: string; steps: readonly WidgetStep[] }[] = [
  { id: "record", label: "Record", steps: ["home", "recording"] },
  { id: "evidence", label: "The event", steps: ["review"] },
  { id: "code", label: "The tag", steps: ["generating", "result"] },
  { id: "verify", label: "Proof", steps: ["verify"] },
  { id: "deploy", label: "Deploy", steps: ["deploy", "done"] },
];

const JOB_TITLES: Record<WidgetGoal, string> = {
  transaction: "Transaction tag",
  signup: "Sign-up tag",
};

export interface AppHandlers {
  onStartRecording(goal: WidgetGoal): void;
  onStopRecording(): void;
  onDiscard(): void;
  onToggleMark(id: string): void;
  onNotes(notes: string): void;
  onBackToRecording(): void;
  onGenerate(): void;
  onCancelGenerate(): void;
  onRegenerate(): void;
  onCodeEdit(code: string): void;
  onRechoose(): void;
  onEvidenceMode(mode: "suggest" | "pinpoint"): void;
  onVerify(): void;
  onVerifyRunAgain(): void;
  onBackToCode(): void;
  onApproveVerify(): void;
  onSelectTarget(kind: "domain" | "app-id"): void;
  onDeploy(): void;
  onStartAnother(): void;
  onRequestReset(): void;
  onConfirmReset(): void;
  onCancelReset(): void;
  onCheckAccess(): void;
  onSettingsPatch(patch: Partial<Settings>): void;
  onSignOut(): void;
  onClearDedup(): void;
  onInjectTag(url: string): void;
  onClearAllJobs(): void;
  onOpenJobs(): void;
}

/** Verify/deploy view state the panel owns outside the persisted session. */
export interface AppFlowState {
  verifyRunErrors: string[];
  deploy: {
    targets: { domain: TargetState; appId: TargetState | null };
    selected: "domain" | "app-id";
    deploying: boolean;
    deployError: string;
    deployBlocked: string;
    cdnState: "idle" | "waiting" | "live" | "gave-up";
  };
}

export interface AppProps {
  /** The hostname the panel is bound to — the job's identity and the deploy file's name. */
  site: string;
  session: WidgetSession;
  status: TrackerStatus;
  /** The last 7 days of every MediaJel tag on the page. */
  activity: TagActivityState;
  identity: Identity | null;
  settings: Settings;
  handlers: AppHandlers;
  flow: AppFlowState;
  /** Why Generate is unavailable ("" when it may run). */
  generateBlocked: string;
  /** Which finished slips the operator has opened back up. */
  expanded: readonly string[];
  onToggleSlip(number: string): void;
  confirmingReset: boolean;
  access: { status: "idle" | "checking" | "ok" | "error"; message: string };
  settingsOpen: boolean;
  onOpenSettings(): void;
  onCloseSettings(): void;
  /** The tag URL "load the tag on this page" would use. */
  tagUrl: string;
  /** The action in flight, or null. */
  pending: Pending | null;
  /** A failure from the flow itself — shown at the action that caused it. */
  flowError: string;
}

const seconds = (session: WidgetSession): number => {
  const last = session.timeline[session.timeline.length - 1];
  return last ? Math.round(last.t / 1000) : 0;
};

/** English for a small count, so a receipt reads as a sentence and not as a readout. */
const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number, singular: string, plural = `${singular}s`): string =>
  `${n <= 10 ? words[n] : n} ${n === 1 ? singular : plural}`;

const duration = (total: number): string => {
  if (total < 60) return count(total, "second");
  const minutes = Math.round(total / 60);
  return count(minutes, "minute");
};

/**
 * The sentence a sealed step leaves behind.
 *
 * Five of these read top to bottom are the whole job — which is the entire argument for stacking
 * them, and the reason they are written rather than tabulated. Anything a person cannot act on
 * (a sha, a path, a field tally) belongs behind the disclosure, not here.
 */
const receiptFor = (id: string, session: WidgetSession): string => {
  switch (id) {
    case "record": {
      const pages = session.pages.length;
      return `${count(session.timeline.length, "event")} over ${duration(seconds(session))}${
        pages > 1 ? `, across ${count(pages, "page")}` : ""
      }`;
    }
    case "evidence":
      return session.markedIds.length > 0
        ? `You pointed at ${session.markedIds.length === 1 ? "the event" : count(session.markedIds.length, "event")}`
        : "The assistant's best guess, accepted";
    case "code": {
      const generation = session.generation;
      if (!generation) return "";
      const fromPage = generation.fieldCoverage.filter(
        (entry) => entry.status === "mapped" || entry.status === "derived",
      ).length;
      const missing = generation.fieldCoverage.filter((entry) => entry.status === "missing").length;
      return missing > 0
        ? `Written from the page — ${count(missing, "field")} it could not find`
        : `Written from the page — ${count(fromPage, "field")} taken from what you recorded`;
    }
    case "verify": {
      const captured = session.verify?.captured.length ?? 0;
      return captured === 1
        ? "It fired here, and nothing reached the collector"
        : `It fired ${count(captured, "time")} here, and nothing reached the collector`;
    }
    case "deploy":
      return session.deploy?.update ? "Updated on master" : "Added to master";
    default:
      return "";
  }
};

/** A step's row in the stack: its name, and — sealed — its receipt and its stamp. */
const ROW = "flex w-full flex-wrap items-baseline gap-x-3 gap-y-[3px] border-0 bg-transparent px-5 py-4 text-left";
const LABEL = "flex-none font-display text-xl font-semibold tracking-[0.005em] text-foreground";

/** The stamp a sealed step carries. */
const stampFor = (id: string): ReactNode => {
  switch (id) {
    case "record":
      return <Stamp label="Recorded" />;
    case "evidence":
      return <Stamp label="Marked" />;
    case "code":
      return <Stamp label="Written" />;
    case "verify":
      return <Stamp label="Proved" tone="platform" />;
    case "deploy":
      return <Stamp label="Deployed" tone="platform" filled />;
    default:
      return null;
  }
};

/** What 01 shows once the recording is over: the record, not the controls. */
const RecordSummary = ({ session }: { session: WidgetSession }): ReactNode => (
  <SectionBody>
    <Definitions
      entries={[
        ["job", JOB_TITLES[session.goal]],
        ["events", session.timeline.length],
        ["pages", session.pages.length],
        ["duration", `${seconds(session)}s`],
      ]}
    />
    {session.truncated ? <Fine>Some cheap events were dropped to stay inside the storage budget.</Fine> : null}
  </SectionBody>
);

/**
 * What the pinned action says while it is working.
 *
 * Named per action rather than a generic "Working…", because this button is the only thing an
 * operator is watching and the things it can be doing take between 200ms and two minutes.
 *
 * A total `Record`, not a `Partial`: adding a `Pending` member without a label here should fail
 * the build, not ship a button that goes silent while it works.
 */
const WORKING_LABEL: Record<Pending, string> = {
  starting: "Starting…",
  stopping: "Stopping…",
  generating: "Writing the tag…",
  cancelling: "Cancelling…",
  verifying: "Verifying on the page…",
  "checking-targets": "Reading the repo…",
  deploying: "Deploying…",
  resetting: "Starting over…",
  "loading-job": "Working…",
};

/** The one next action, and what it will do. Derived from the step so it can never disagree. */
interface Action {
  label: string;
  consequence: string;
  onClick?(): void;
  tone?: "primary" | "danger";
  /** Why it cannot run. Shown in place of the consequence; the button stays reachable. */
  blocked?: string;
}

const actionFor = (props: AppProps): Action | null => {
  const { session, handlers, flow, generateBlocked } = props;
  switch (session.step) {
    case "home":
      return {
        label: "Start recording",
        consequence: "Watches this page while you make a real purchase or sign-up.",
        onClick: () => handlers.onStartRecording(session.goal),
      };
    case "recording":
      return {
        label: "Stop recording",
        consequence: `${session.timeline.length} events so far. Next you say which one was the event.`,
        onClick: handlers.onStopRecording,
      };
    case "review":
      return {
        label: "Generate the tag",
        consequence: "Sends the masked recording to MediaJel's assistant service.",
        onClick: generateBlocked ? props.onOpenSettings : handlers.onGenerate,
        blocked: generateBlocked,
      };
    case "generating":
      return {
        label: "Cancel",
        consequence: "The assistant is writing the tag. This stops it and keeps your evidence.",
        onClick: handlers.onCancelGenerate,
        tone: "danger",
      };
    case "result":
      return {
        label: "Verify on this page",
        consequence: "Runs the tag here with trackTrans intercepted — nothing reaches the collector.",
        onClick: handlers.onVerify,
      };
    case "verify": {
      const captured = session.verify?.captured ?? [];
      if (captured.length === 0) {
        return {
          label: "Approve and continue",
          consequence: "",
          blocked: `Nothing has fired yet — do the ${session.goal === "transaction" ? "purchase" : "sign-up"} again on this page.`,
        };
      }
      // The same check the Verify body shows against each capture. "Something fired" is not the
      // bar; a payload that would actually track is.
      const marked = session.timeline.filter((event) => session.markedIds.includes(event.id));
      const latest = captured[captured.length - 1] as InterceptedCall;
      const verdict = checkPayload(latest, session.goal, marked);
      return {
        label: "Approve and continue",
        consequence: `${captured.length} call${captured.length === 1 ? "" : "s"} intercepted. Next you choose where the tag lives.`,
        onClick: verdict.ok ? handlers.onApproveVerify : undefined,
        blocked: verdict.ok ? undefined : "The last call has problems — read them above and run it again.",
      };
    }
    case "deploy": {
      const current = flow.deploy.selected === "domain" ? flow.deploy.targets.domain : flow.deploy.targets.appId;
      const update = !!current?.existing && typeof current.existing === "object";
      return {
        label: flow.deploy.deploying ? "Deploying…" : update ? "Update on master" : "Deploy to master",
        consequence: "Commits to master of the frictionless repo. Live after its CI, with no review in between.",
        onClick: flow.deploy.deploying
          ? undefined
          : flow.deploy.deployBlocked
            ? props.onOpenSettings
            : handlers.onDeploy,
        blocked: flow.deploy.deployBlocked,
      };
    }
    case "done":
      return {
        label: "Start another job",
        consequence: "Keeps this receipt and clears the sheet for the next site.",
        onClick: handlers.onStartAnother,
      };
    default:
      return null;
  }
};

type Section = (typeof SECTIONS)[number];

/** The body a section shows: its controls while it is the live step, its record once sealed. */
const bodyFor = (props: AppProps, section: Section, active: boolean): ReactNode => {
  const { session, status, handlers, flow, generateBlocked, identity, onOpenSettings } = props;
  switch (section.id) {
    case "record":
      return active ? (
        <RecordSection
          session={session}
          status={status}
          onStart={handlers.onStartRecording}
          onDiscard={handlers.onDiscard}
        />
      ) : (
        <RecordSummary session={session} />
      );
    case "evidence":
      return (
        <EvidenceSection
          session={session}
          onToggleMark={handlers.onToggleMark}
          onNotes={handlers.onNotes}
          onBackToRecording={handlers.onBackToRecording}
          onMode={handlers.onEvidenceMode}
          generateBlocked={generateBlocked}
          readOnly={!active}
        />
      );
    case "code":
      return session.generation || active ? (
        <CodeSection
          session={session}
          providerLabel="MediaJel's assistant"
          onCancel={handlers.onCancelGenerate}
          onRegenerate={handlers.onRegenerate}
          onCodeEdit={handlers.onCodeEdit}
          onRechoose={handlers.onRechoose}
          readOnly={!active}
        />
      ) : null;
    case "verify":
      return (
        <VerifySection
          session={session}
          runErrors={flow.verifyRunErrors}
          onRunAgain={handlers.onVerifyRunAgain}
          onBackToCode={handlers.onBackToCode}
          readOnly={!active}
        />
      );
    case "deploy":
      return (
        <DeploySection
          session={session}
          identity={identity}
          targets={flow.deploy.targets}
          selected={flow.deploy.selected}
          deployError={flow.deploy.deployError}
          cdnState={flow.deploy.cdnState}
          onSelectTarget={handlers.onSelectTarget}
          onOpenSettings={onOpenSettings}
          onExit={handlers.onOpenJobs}
        />
      );
    default:
      return null;
  }
};

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

interface StepProps {
  section: Section;
  /** The bottom of the ticket tears off like the top of it. */
  last: boolean;
}

/**
 * Ahead of the work: present, named, and deliberately not a slip — there is no record to show
 * yet, and inventing one would be the first lie in a product whose whole argument is that it
 * does not.
 */
const AheadStep = ({ section, last }: StepProps): ReactNode => (
  <li className={cn("px-5 py-[11px]", last && "tear-bottom")}>
    <span className={cn(LABEL, "font-normal text-ink-faint")}>{section.label}</span>
  </li>
);

/**
 * A sealed step: a carbon copy of the sheet, on darker stock, its line pressed rather than drawn.
 * No border — a change of paper is what separates one from the next. Its row opens it back up.
 */
const SealedStep = ({
  section,
  last,
  open,
  session,
  onToggle,
  children,
}: StepProps & { open: boolean; session: WidgetSession; onToggle(): void; children: ReactNode }): ReactNode => (
  <Collapsible asChild open={open} onOpenChange={onToggle}>
    <li className={cn("bg-carbon shadow-press", last && "tear-bottom")}>
      <CollapsibleTrigger asChild>
        <button type="button" className={cn(ROW, "group cursor-pointer")}>
          <span className={LABEL}>{section.label}</span>
          <span className="order-1 flex-[1_0_100%] text-base leading-[1.5] text-carbon-ink">
            {receiptFor(section.id, session)}
          </span>
          <span className="ml-auto">{stampFor(section.id)}</span>
          <Chevron className="group-aria-expanded:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </li>
  </Collapsible>
);

/** The live step: the full sheet, at the bottom of the stack, nearest the action bar. */
const LiveStep = ({
  section,
  last,
  session,
  children,
}: StepProps & { session: WidgetSession; children: ReactNode }) => (
  <li className={cn("bg-sheet shadow-press", last && "tear-bottom")}>
    <div className={ROW}>
      <span className={LABEL}>{section.label}</span>
      <span className="ml-auto">
        {session.step === "recording" ? `${session.timeline.length} events` : null}
        {session.step === "done" ? stampFor("deploy") : null}
      </span>
    </div>
    {children}
  </li>
);

/** The stack: every step in order, each in the state the job has left it. */
const Steps = (props: AppProps): ReactNode => {
  const { session, expanded, onToggleSlip } = props;
  const activeOrder = SECTIONS.findIndex((section) => section.steps.includes(session.step));
  return SECTIONS.map((section, order) => {
    const last = order === SECTIONS.length - 1;
    if (order > activeOrder) return <AheadStep key={section.id} section={section} last={last} />;
    if (order < activeOrder) {
      return (
        <SealedStep
          key={section.id}
          section={section}
          last={last}
          open={expanded.includes(section.id)}
          session={session}
          onToggle={() => onToggleSlip(section.id)}
        >
          {bodyFor(props, section, false)}
        </SealedStep>
      );
    }
    return (
      <LiveStep key={section.id} section={section} last={last} session={session}>
        {bodyFor(props, section, true)}
      </LiveStep>
    );
  });
};

const Actions = (props: AppProps): ReactNode => {
  const action = actionFor(props);
  if (!action) return null;
  // Only the pinned action reflects flight. A background read (Settings' access check) has its
  // own affordance and must not make the primary button look busy.
  const working = props.pending ? WORKING_LABEL[props.pending] : undefined;
  return (
    <ActionBar
      label={action.label}
      consequence={action.consequence}
      onClick={action.onClick}
      tone={action.tone}
      blocked={action.blocked}
      working={working}
      error={props.flowError}
    />
  );
};

/** What fills the panel under the zigzag: the report, Settings, or the stack and its action. */
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
  return (
    <>
      <Stack list>
        <Steps {...props} />
      </Stack>
      <Actions {...props} />
    </>
  );
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
