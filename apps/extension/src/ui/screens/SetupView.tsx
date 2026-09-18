import { ReactNode } from "react";

import { TrackerStatus } from "@mediajel/assistant-core/tags";
import { WidgetSession, WidgetStep } from "@mediajel/assistant-core/types";
import { InterceptedCall } from "@mediajel/assistant-core/verify/interceptor";
import { checkPayload } from "@mediajel/assistant-core/verify/payload-check";

import type { Identity } from "~/auth/cognito";
import type { Pending } from "~/sidepanel/usePanel";
import { ActionBar } from "~/ui/components/ActionBar";
import { Chevron } from "~/ui/components/Chevron";
import { Definitions } from "~/ui/components/Definitions";
import { Stack } from "~/ui/components/Panel";
import { Fine, SectionBody } from "~/ui/components/Section";
import Stamp from "~/ui/components/Stamp";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { AppFlowState, AppHandlers, JOB_TITLES } from "~/ui/contract";
import CodeSection from "~/ui/screens/CodeSection";
import DeploySection from "~/ui/screens/DeploySection";
import EvidenceSection from "~/ui/screens/EvidenceSection";
import RecordSection from "~/ui/screens/RecordSection";
import VerifySection from "~/ui/screens/VerifySection";
import { cn } from "~/lib/utils";

/**
 * Tracking setup: the job itself — the carbon stack and its pinned action.
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
const SECTIONS: readonly { id: string; label: string; steps: readonly WidgetStep[] }[] = [
  { id: "record", label: "Record", steps: ["home", "recording"] },
  { id: "evidence", label: "The event", steps: ["review"] },
  { id: "code", label: "The tag", steps: ["generating", "result"] },
  { id: "verify", label: "Proof", steps: ["verify"] },
  { id: "deploy", label: "Deploy", steps: ["deploy", "done"] },
];

/** What the setup view reads: the job, what the page says about its tag, and every move it can make. */
export interface SetupViewProps {
  session: WidgetSession;
  status: TrackerStatus;
  identity: Identity | null;
  handlers: AppHandlers;
  flow: AppFlowState;
  /** Why Generate is unavailable ("" when it may run). */
  generateBlocked: string;
  /** Which finished slips the operator has opened back up. */
  expanded: readonly string[];
  onToggleSlip(number: string): void;
  onOpenSettings(): void;
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
const recordReceipt = (session: WidgetSession): string => {
  const pages = session.pages.length;
  const across = pages > 1 ? `, across ${count(pages, "page")}` : "";
  return `${count(session.timeline.length, "event")} over ${duration(seconds(session))}${across}`;
};

const evidenceReceipt = (session: WidgetSession): string => {
  const marked = session.markedIds.length;
  if (marked === 0) return "The assistant's best guess, accepted";
  return `You pointed at ${marked === 1 ? "the event" : count(marked, "event")}`;
};

const codeReceipt = (session: WidgetSession): string => {
  const generation = session.generation;
  if (!generation) return "";
  const fromPage = generation.fieldCoverage.filter((entry) => entry.status === "mapped" || entry.status === "derived");
  const missing = generation.fieldCoverage.filter((entry) => entry.status === "missing").length;
  return missing > 0
    ? `Written from the page — ${count(missing, "field")} it could not find`
    : `Written from the page — ${count(fromPage.length, "field")} taken from what you recorded`;
};

const verifyReceipt = (session: WidgetSession): string => {
  const captured = session.verify?.captured.length ?? 0;
  return captured === 1
    ? "It fired here, and nothing reached the collector"
    : `It fired ${count(captured, "time")} here, and nothing reached the collector`;
};

const deployReceipt = (session: WidgetSession): string =>
  session.deploy?.update ? "Updated on master" : "Added to master";

const RECEIPTS: Record<string, (session: WidgetSession) => string> = {
  record: recordReceipt,
  evidence: evidenceReceipt,
  code: codeReceipt,
  verify: verifyReceipt,
  deploy: deployReceipt,
};

const receiptFor = (id: string, session: WidgetSession): string => RECEIPTS[id]?.(session) ?? "";

/** A step's row in the stack: its name, and — sealed — its receipt and its stamp. */
const ROW = "flex w-full flex-wrap items-baseline gap-x-3 gap-y-[3px] border-0 bg-transparent px-5 py-4 text-left";
const LABEL = "flex-none font-display text-xl font-semibold tracking-[0.005em] text-foreground";

/** The stamp a sealed step carries. */
const STAMPS: Record<string, ReactNode> = {
  record: <Stamp label="Recorded" />,
  evidence: <Stamp label="Marked" />,
  code: <Stamp label="Written" />,
  verify: <Stamp label="Proved" tone="platform" />,
  deploy: <Stamp label="Deployed" tone="platform" filled />,
};

const stampFor = (id: string): ReactNode => STAMPS[id] ?? null;

/** What Record shows once the recording is over: the record, not the controls. */
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

const homeAction = ({ session, handlers }: SetupViewProps): Action => ({
  label: "Start recording",
  consequence: "Watches this page while you make a real purchase or sign-up.",
  onClick: () => handlers.onStartRecording(session.goal),
});

const recordingAction = ({ session, handlers }: SetupViewProps): Action => ({
  label: "Stop recording",
  consequence: `${session.timeline.length} events so far. Next you say which one was the event.`,
  onClick: handlers.onStopRecording,
});

const reviewAction = ({ handlers, generateBlocked, onOpenSettings }: SetupViewProps): Action => ({
  label: "Generate the tag",
  consequence: "Sends the masked recording to MediaJel's assistant service.",
  onClick: generateBlocked ? onOpenSettings : handlers.onGenerate,
  blocked: generateBlocked,
});

const generatingAction = ({ handlers }: SetupViewProps): Action => ({
  label: "Cancel",
  consequence: "The assistant is writing the tag. This stops it and keeps your evidence.",
  onClick: handlers.onCancelGenerate,
  tone: "danger",
});

const resultAction = ({ handlers }: SetupViewProps): Action => ({
  label: "Verify on this page",
  consequence: "Runs the tag here with trackTrans intercepted — nothing reaches the collector.",
  onClick: handlers.onVerify,
});

/** Approve is only clickable once the last intercepted call would actually track — the same check the Verify body shows. */
const approveAction = (session: WidgetSession, captured: InterceptedCall[], handlers: AppHandlers): Action => {
  const marked = session.timeline.filter((event) => session.markedIds.includes(event.id));
  const verdict = checkPayload(captured[captured.length - 1], session.goal, marked);
  return {
    label: "Approve and continue",
    consequence: `${captured.length} call${captured.length === 1 ? "" : "s"} intercepted. Next you choose where the tag lives.`,
    onClick: verdict.ok ? handlers.onApproveVerify : undefined,
    blocked: verdict.ok ? undefined : "The last call has problems — read them above and run it again.",
  };
};

/** The calls Verify has intercepted so far on this page. */
const capturedCalls = (session: WidgetSession): InterceptedCall[] =>
  (session.verify?.captured ?? []) as InterceptedCall[];

const waitingAction = (goal: WidgetSession["goal"]): Action => ({
  label: "Approve and continue",
  consequence: "",
  blocked: `Nothing has fired yet — do the ${goal === "transaction" ? "purchase" : "sign-up"} again on this page.`,
});

const verifyAction = ({ session, handlers }: SetupViewProps): Action => {
  const captured = capturedCalls(session);
  return captured.length > 0 ? approveAction(session, captured, handlers) : waitingAction(session.goal);
};

/** Whether the chosen deploy target already holds a file, so the action says update rather than deploy. */
const updatesExisting = (flow: AppFlowState): boolean => {
  const current = flow.deploy.selected === "domain" ? flow.deploy.targets.domain : flow.deploy.targets.appId;
  return !!current?.existing && typeof current.existing === "object";
};

const deployLabel = (flow: AppFlowState): string => {
  if (flow.deploy.deploying) return "Deploying…";
  return updatesExisting(flow) ? "Update on master" : "Deploy to master";
};

const deployClick = ({ flow, handlers, onOpenSettings }: SetupViewProps): (() => void) | undefined => {
  if (flow.deploy.deploying) return undefined;
  return flow.deploy.deployBlocked ? onOpenSettings : handlers.onDeploy;
};

const deployAction = (props: SetupViewProps): Action => ({
  label: deployLabel(props.flow),
  consequence: "Commits to master of the frictionless repo. Live after its CI, with no review in between.",
  onClick: deployClick(props),
  blocked: props.flow.deploy.deployBlocked,
});

const doneAction = ({ handlers }: SetupViewProps): Action => ({
  label: "Start another job",
  consequence: "Keeps this receipt and clears the sheet for the next site.",
  onClick: handlers.onStartAnother,
});

/** A total record: a new step without an action here fails the build rather than shipping a silent bar. */
const ACTIONS: Record<WidgetStep, (props: SetupViewProps) => Action> = {
  home: homeAction,
  recording: recordingAction,
  review: reviewAction,
  generating: generatingAction,
  result: resultAction,
  verify: verifyAction,
  deploy: deployAction,
  done: doneAction,
};

const actionFor = (props: SetupViewProps): Action => ACTIONS[props.session.step](props);

type Section = (typeof SECTIONS)[number];

/** The body a section shows: its controls while it is the live step, its record once sealed. */
const recordBody = ({ session, status, handlers }: SetupViewProps, active: boolean): ReactNode =>
  active ? (
    <RecordSection
      session={session}
      status={status}
      onStart={handlers.onStartRecording}
      onDiscard={handlers.onDiscard}
    />
  ) : (
    <RecordSummary session={session} />
  );

const evidenceBody = ({ session, handlers, generateBlocked }: SetupViewProps, active: boolean): ReactNode => (
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

const codeBody = ({ session, handlers }: SetupViewProps, active: boolean): ReactNode =>
  session.generation || active ? (
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

const verifyBody = ({ session, flow, handlers }: SetupViewProps, active: boolean): ReactNode => (
  <VerifySection
    session={session}
    runErrors={flow.verifyRunErrors}
    onRunAgain={handlers.onVerifyRunAgain}
    onBackToCode={handlers.onBackToCode}
    readOnly={!active}
  />
);

const deployBody = ({ session, identity, flow, handlers, onOpenSettings }: SetupViewProps): ReactNode => (
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

const BODIES: Record<string, (props: SetupViewProps, active: boolean) => ReactNode> = {
  record: recordBody,
  evidence: evidenceBody,
  code: codeBody,
  verify: verifyBody,
  deploy: deployBody,
};

const bodyFor = (props: SetupViewProps, section: Section, active: boolean): ReactNode =>
  BODIES[section.id]?.(props, active) ?? null;

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
const Steps = (props: SetupViewProps): ReactNode => {
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

const Actions = (props: SetupViewProps): ReactNode => {
  const action = actionFor(props);
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

/** The stack and its pinned action: the only view that draws a primary action. */
export const SetupView = (props: SetupViewProps): ReactNode => (
  <>
    <Stack list>
      <Steps {...props} />
    </Stack>
    <Actions {...props} />
  </>
);
