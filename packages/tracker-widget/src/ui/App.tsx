/*
THESIS: The assistant is a job sheet, not a chatbot — one integration work order per site that fills in top-to-bottom and stamps each finished section; it refuses the stepper-with-progress-dots and the chat bubble.
OWN-WORLD: MediaJel paper (#E6E9EB ground, white card), Avenir Next ink, SF Mono figures; identity blue is the live ink, platform green the VERIFIED/DEPLOYED stamp, partner orange the VOID stamp and warnings, privacy purple marks anything that leaves the browser; the MJ zigzag as section rule; numbered sections 01–05; hairline rules #C7CDD3; stamps tilted 4°.
STORY: I see my job written down, watch evidence accumulate, get code with an honest field checklist, prove it on this page, ship it — and keep the receipt.
FIRST VIEWPORT: a 380×min(600px,80vh) paper card bottom-right: header (mark, zigzag rule, Site / App / Job), then five numbered section rows; the open section is expanded and carries the primary action in its footer; the launcher is a small paper tag-chip with the mark and the latest stamp.
FORM: Work order, #3 of 7 ordered structures, seed edfb6964 (surface/operate).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/

import { QueryStringContext } from "@mediajel/tracker-core/types";
import { TrackerStatus } from "@mediajel/tracker-widget/recorder/context";
import { WidgetSettings, WidgetSettingsPatch } from "@mediajel/tracker-widget/session/settings";
import { STEP_ORDER } from "@mediajel/tracker-widget/state/machine";
import { WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/tracker-widget/types";
import Stamp from "@mediajel/tracker-widget/ui/components/Stamp";
import { ChevronDown, Gear, Mark, Zigzag } from "@mediajel/tracker-widget/ui/icons";
import CodeSection from "@mediajel/tracker-widget/ui/screens/CodeSection";
import EvidenceSection from "@mediajel/tracker-widget/ui/screens/EvidenceSection";
import RecordSection from "@mediajel/tracker-widget/ui/screens/RecordSection";
import SettingsOverlay from "@mediajel/tracker-widget/ui/screens/SettingsOverlay";
import { ComponentChildren, VNode } from "@mediajel/tracker-widget/vendor";

/**
 * The work order itself: a collapsed paper chip, or the card with its letterhead, its three
 * definition rows and its five numbered sections. The section that owns the current step is
 * open and carries the primary action in its footer; finished sections collapse to their
 * stamped one-line summary. Nothing disappears.
 */

/** The five sections of the work order and the step(s) each one owns. */
export const SECTIONS: readonly { number: string; label: string; steps: readonly WidgetStep[] }[] = [
  { number: "01", label: "Record", steps: ["home", "recording"] },
  { number: "02", label: "Evidence", steps: ["review"] },
  { number: "03", label: "Code", steps: ["generating", "result"] },
  { number: "04", label: "Verify", steps: ["verify"] },
  { number: "05", label: "Deploy", steps: ["deploy", "done"] },
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
  onVerify(): void;
  onSettingsPatch(patch: WidgetSettingsPatch): void;
  onForget(): void;
  onClearDedup(): void;
}

export interface AppProps {
  /** The tag's parsed query string — what the operator is looking at, in its own words. */
  context: QueryStringContext;
  session: WidgetSession;
  settings: WidgetSettings;
  status: TrackerStatus;
  handlers: AppHandlers;
  /** Why Generate is unavailable ("" when it may run). Drives the Evidence footer. */
  generateBlocked: string;
  /** False shows the launcher chip, true the card. */
  open: boolean;
  onToggleOpen(): void;
  settingsOpen: boolean;
  onOpenSettings(): void;
  onCloseSettings(): void;
}

/** A definition row from the letterhead: Site, App, Job. */
const Definition = ({ label, value, variant }: { label: string; value: string; variant?: "job" }): VNode => (
  <>
    <dt class="mj-def-label">{label}</dt>
    <dd
      class={["mj-def-value", variant === "job" ? "mj-def-value--job" : "", value ? "" : "mj-def-value--empty"]
        .filter(Boolean)
        .join(" ")}
    >
      {value || "Not set"}
    </dd>
  </>
);

/** What the collapsed row on the right says about a section's state. */
const sectionState = (section: (typeof SECTIONS)[number], session: WidgetSession): VNode | string | null => {
  const currentIndex = STEP_ORDER.indexOf(session.step);
  const lastOwned = STEP_ORDER.indexOf(section.steps[section.steps.length - 1]);

  if (section.number === "01") {
    if (session.step === "recording") return `${session.timeline.length} events`;
    if (currentIndex > lastOwned) return <Stamp label="Recorded" />;
    return null;
  }
  if (section.number === "02" && currentIndex > lastOwned) {
    return <Stamp label={`${session.markedIds.length} pinned`} />;
  }
  if (section.number === "03" && currentIndex > lastOwned) return <Stamp label="Generated" />;
  if (currentIndex > lastOwned) return <Stamp label="Done" />;
  return null;
};

const Section = ({
  section,
  session,
  isOpen,
  reached,
  children,
}: {
  section: (typeof SECTIONS)[number];
  session: WidgetSession;
  isOpen: boolean;
  reached: boolean;
  children?: ComponentChildren;
}): VNode => (
  <li class="mj-section">
    {/* aria-disabled without `disabled`: the row stays in the tab order (keyboard reachable
        everywhere), announces its state, and simply does nothing until its screen exists. */}
    <button
      type="button"
      class="mj-section-row"
      data-reached={String(reached)}
      aria-expanded={String(isOpen) as "true" | "false"}
      aria-disabled={!reached}
    >
      <span class="mj-section-number">{section.number}</span>
      <span class="mj-section-label">{section.label}</span>
      <span class="mj-section-state">{sectionState(section, session)}</span>
      <ChevronDown class="mj-chevron" />
    </button>
    {isOpen && children}
  </li>
);

export const App = ({
  context,
  session,
  settings,
  status,
  handlers,
  generateBlocked,
  open,
  onToggleOpen,
  settingsOpen,
  onOpenSettings,
  onCloseSettings,
}: AppProps): VNode => {
  const job = JOB_TITLES[session.goal];

  if (!open) {
    return (
      <button
        type="button"
        class="mj-chip"
        onClick={onToggleOpen}
        aria-label={`MediaJel work order — ${job}, ${session.step}. Open.`}
      >
        <Mark class="mj-chip-mark" />
        <span class="mj-chip-label">{session.step === "recording" ? "REC" : "Work order"}</span>
        {session.step === "recording" && <span class="mj-rec-dot" aria-hidden="true" />}
      </button>
    );
  }

  const currentIndex = STEP_ORDER.indexOf(session.step);

  const bodies: Partial<Record<string, ComponentChildren>> = {
    "01": (
      <RecordSection
        session={session}
        status={status}
        onStart={handlers.onStartRecording}
        onStop={handlers.onStopRecording}
        onDiscard={handlers.onDiscard}
      />
    ),
    "02": (
      <EvidenceSection
        session={session}
        onToggleMark={handlers.onToggleMark}
        onNotes={handlers.onNotes}
        onBackToRecording={handlers.onBackToRecording}
        onGenerate={handlers.onGenerate}
        generateBlocked={generateBlocked}
      />
    ),
    "03": (
      <CodeSection
        session={session}
        providerLabel={`${settings.provider}${settings.model ? ` · ${settings.model}` : ""}`}
        onCancel={handlers.onCancelGenerate}
        onRegenerate={handlers.onRegenerate}
        onCodeEdit={handlers.onCodeEdit}
        onVerify={handlers.onVerify}
      />
    ),
  };

  return (
    <section class="mj-card" aria-label="MediaJel Integration Work Order">
      <header class="mj-header">
        <div class="mj-letterhead">
          <Mark class="mj-mark" />
          <span class="mj-wordmark">MediaJel</span>
          <span class="mj-letterhead-rule" />
          <span class="mj-doc-title">Integration Work Order</span>
          <div class="mj-header-actions">
            <button
              type="button"
              class="mj-icon-button"
              aria-label="Settings"
              aria-disabled={!onOpenSettings}
              onClick={onOpenSettings}
            >
              <Gear />
            </button>
            <button type="button" class="mj-icon-button" aria-label="Collapse the work order" onClick={onToggleOpen}>
              <ChevronDown />
            </button>
          </div>
        </div>

        <dl class="mj-defs">
          <Definition label="Site" value={location.hostname} />
          <Definition label="App" value={context.appId ?? ""} />
          <Definition label="Job" value={job} variant="job" />
        </dl>
      </header>

      <Zigzag live={session.step === "recording"} />

      {settingsOpen ? (
        <SettingsOverlay
          settings={settings}
          appId={String(context.appId ?? "")}
          onPatch={handlers.onSettingsPatch}
          onForget={handlers.onForget}
          onClearDedup={handlers.onClearDedup}
          onClose={onCloseSettings}
        />
      ) : (
        <ol class="mj-sections">
          {SECTIONS.map((section) => (
            <Section
              key={section.number}
              section={section}
              session={session}
              isOpen={section.steps.includes(session.step)}
              reached={currentIndex >= STEP_ORDER.indexOf(section.steps[0])}
            >
              {bodies[section.number]}
            </Section>
          ))}
        </ol>
      )}
    </section>
  );
};

export default App;
