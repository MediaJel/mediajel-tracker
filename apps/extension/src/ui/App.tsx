/*
THESIS: One integration job sheet per site, kept as carbon copies — every finished step seals into a stamped slip that stays readable above the live work, and the next action is always in the same place at the bottom; it refuses the wizard-with-progress-dots and the chat transcript.
OWN-WORLD: MediaJel paper (#E6E9EB ground, white sheet; ink ground in dark), Avenir Next ink, SF Mono figures; identity blue is the live ink and the carbon impression, platform green the VERIFIED/DEPLOYED stamp, partner orange warnings, privacy purple anything that leaves the browser; the MJ zigzag as the rule; numbered sections 01–05; hairlines #C7CDD3; stamps tilted 4°.
STORY: I see which site I am on and who I am, watch evidence accumulate, get code with an honest field checklist, prove it on this page, ship it — and the receipt for every step stays stacked above me.
FIRST VIEWPORT: a full-height side panel: letterhead (mark, MEDIAJEL, signed-in name, jobs, gear), Site / App / Tag rows, the zigzag rule, then the carbon stack — finished steps as tinted stamped slips, the live step as the full sheet at the bottom — under a pinned action bar naming the one next action and what it will do.
FORM: Carbon-copy stack, #3 of 7 ordered structures, seed ea35aae4 (surface/operate).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/

import { ReactNode } from "react";

import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";
import { WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/assistant-core/types";
import { InterceptedCall } from "@mediajel/assistant-core/verify/interceptor";
import { checkPayload } from "@mediajel/assistant-core/verify/payload-check";

import type { Identity } from "~/auth/cognito";
import type { Pending } from "~/sidepanel/usePanel";
import { Settings } from "~/store/settings";
import Stamp from "~/ui/components/Stamp";
import { ChevronDown, Gear, Mark, Person, Restart, Zigzag } from "~/ui/icons";
import CodeSection from "~/ui/screens/CodeSection";
import DeploySection, { TargetState } from "~/ui/screens/DeploySection";
import EvidenceSection from "~/ui/screens/EvidenceSection";
import RecordSection from "~/ui/screens/RecordSection";
import SettingsOverlay from "~/ui/screens/SettingsOverlay";
import VerifySection from "~/ui/screens/VerifySection";

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
  <div className="mj-section-body">
    <dl className="mj-counts">
      <dt>job</dt>
      <dd>{JOB_TITLES[session.goal]}</dd>
      <dt>events</dt>
      <dd>{session.timeline.length}</dd>
      <dt>pages</dt>
      <dd>{session.pages.length}</dd>
      <dt>duration</dt>
      <dd>{seconds(session)}s</dd>
    </dl>
    {session.truncated ? (
      <p className="mj-fine">Some cheap events were dropped to stay inside the storage budget.</p>
    ) : null}
  </div>
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

export const App = (props: AppProps): ReactNode => {
  const {
    site,
    session,
    status,
    identity,
    settings,
    handlers,
    flow,
    generateBlocked,
    expanded,
    onToggleSlip,
    confirmingReset,
    access,
    settingsOpen,
    onOpenSettings,
    onCloseSettings,
    tagUrl,
  } = props;

  const activeId = SECTIONS.find((section) => section.steps.includes(session.step))?.id ?? "record";
  const activeOrder = SECTIONS.findIndex((section) => section.id === activeId);

  const bodyFor = (section: (typeof SECTIONS)[number], active: boolean): ReactNode => {
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

  const action = actionFor(props);
  // Only the pinned action reflects flight. A background read (Settings' access check) has its
  // own affordance and must not make the primary button look busy.
  const working = props.pending ? WORKING_LABEL[props.pending] : undefined;

  return (
    <div className="mj-panel">
      <header className="mj-header">
        <div className="mj-letterhead">
          <Mark className="mj-mark" />
          <span className="mj-wordmark">MediaJel</span>
          <span className="mj-letterhead-rule" />
          <span className="mj-doc-title">Work order</span>

          <div className="mj-header-actions">
            {session.step !== "home" && (
              <button
                type="button"
                className="mj-icon-button"
                aria-label="Start over"
                title="Start over"
                onClick={handlers.onRequestReset}
              >
                <Restart />
              </button>
            )}
            <button
              type="button"
              className="mj-icon-button"
              aria-label={settingsOpen ? "Close settings" : "Settings"}
              onClick={settingsOpen ? onCloseSettings : onOpenSettings}
            >
              <Gear />
            </button>
          </div>
        </div>

        {/* The job's own name, said once and properly. The app id and the file it will become are
            machine facts, and they wait in Settings and in the Deploy step where they matter. */}
        <h1 className="mj-title">{site}</h1>
        <p className="mj-subtitle">
          <span>{JOB_TITLES[session.goal]}</span>
          <span className="mj-subtitle-dot" aria-hidden="true">
            ·
          </span>
          <button type="button" className="mj-who" onClick={handlers.onOpenJobs} title="Your jobs">
            <Person />
            {identity ? identity.name || identity.username : "Signed out"}
          </button>
        </p>
      </header>

      <Zigzag live={session.step === "recording"} />

      {confirmingReset && (
        <div className="mj-confirm" role="alertdialog" aria-label="Start over?">
          <p>
            Throw away this recording{session.generation ? ", the generated code" : ""} and start over? Your other jobs
            are kept.
          </p>
          <div className="mj-confirm-actions">
            <button type="button" className="mj-btn mj-btn--ghost" onClick={handlers.onCancelReset}>
              Keep working
            </button>
            <button type="button" className="mj-btn mj-btn--danger" onClick={handlers.onConfirmReset}>
              Start over
            </button>
          </div>
        </div>
      )}

      {settingsOpen ? (
        <div className="mj-stack">
          <SettingsOverlay
            identity={identity}
            settings={settings}
            appId={status.appId}
            access={access}
            tagUrl={tagUrl}
            onCheckAccess={handlers.onCheckAccess}
            onPatch={handlers.onSettingsPatch}
            onSignOut={handlers.onSignOut}
            onClearDedup={handlers.onClearDedup}
            onInjectTag={handlers.onInjectTag}
            onClearAllJobs={handlers.onClearAllJobs}
            onClose={onCloseSettings}
          />
        </div>
      ) : (
        <>
          <ol className="mj-stack">
            {SECTIONS.map((section, order) => {
              const active = section.id === activeId;
              const sealed = order < activeOrder;
              const ahead = order > activeOrder;
              const open = active || expanded.includes(section.id);

              // Ahead of the work: present, named, and deliberately not a slip — there is no
              // record to show yet, and inventing one would be the first lie in a product whose
              // whole argument is that it does not.
              if (ahead) {
                return (
                  <li key={section.id} className="mj-ahead">
                    <span className="mj-section-label">{section.label}</span>
                  </li>
                );
              }

              return (
                <li key={section.id} className={sealed ? "mj-slip" : "mj-sheet"}>
                  <button
                    type="button"
                    className="mj-slip-row"
                    aria-expanded={open}
                    onClick={active ? undefined : () => onToggleSlip(section.id)}
                    aria-disabled={active}
                  >
                    <span className="mj-section-label">{section.label}</span>
                    {sealed ? (
                      <>
                        <span className="mj-receipt">{receiptFor(section.id, session)}</span>
                        <span className="mj-section-state">{stampFor(section.id)}</span>
                        <ChevronDown className="mj-chevron" />
                      </>
                    ) : (
                      <span className="mj-section-state">
                        {session.step === "recording" ? `${session.timeline.length} events` : null}
                        {session.step === "done" ? stampFor("deploy") : null}
                      </span>
                    )}
                  </button>
                  {open && bodyFor(section, active)}
                </li>
              );
            })}
          </ol>

          {action && (
            <footer className="mj-actionbar">
              {props.flowError && (
                <p className="mj-actionbar-error" role="alert">
                  {props.flowError}
                </p>
              )}
              <button
                type="button"
                className={`mj-btn ${action.tone === "danger" ? "mj-btn--danger" : "mj-btn--primary"} mj-btn--wide${
                  working ? " mj-btn--working" : ""
                }`}
                aria-disabled={!action.onClick || !!working}
                aria-busy={!!working}
                onClick={working ? undefined : action.onClick}
              >
                {working ?? action.label}
              </button>
              <p
                className={action.blocked && !working ? "mj-consequence mj-consequence--blocked" : "mj-consequence"}
                aria-live="polite"
              >
                {working ? "Leave this panel open — it is still working." : action.blocked || action.consequence}
              </p>
            </footer>
          )}
        </>
      )}
    </div>
  );
};

export default App;
