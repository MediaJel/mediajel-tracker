/*
THESIS: The assistant is a job sheet, not a chatbot — one integration work order per site that fills in top-to-bottom and stamps each finished section; it refuses the stepper-with-progress-dots and the chat bubble.
OWN-WORLD: MediaJel paper (#E6E9EB ground, white card), Avenir Next ink, SF Mono figures; identity blue is the live ink, platform green the VERIFIED/DEPLOYED stamp, partner orange the VOID stamp and warnings, privacy purple marks anything that leaves the browser; the MJ zigzag as section rule; numbered sections 01–05; hairline rules #C7CDD3; stamps tilted 4°.
STORY: I see my job written down, watch evidence accumulate, get code with an honest field checklist, prove it on this page, ship it — and keep the receipt.
FIRST VIEWPORT: a 380×min(600px,80vh) paper card bottom-right: header (mark, zigzag rule, Site / App / Job), then five numbered section rows; the open section is expanded and carries the primary action in its footer; the launcher is a small paper tag-chip with the mark and the latest stamp.
FORM: Work order, #3 of 7 ordered structures, seed edfb6964 (surface/operate).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
*/

import { QueryStringContext } from "@mediajel/tracker-core/types";
import { STEP_ORDER } from "@mediajel/tracker-widget/state/machine";
import { WidgetGoal, WidgetSession, WidgetStep } from "@mediajel/tracker-widget/types";
import { ChevronDown, Gear, Mark, Zigzag } from "@mediajel/tracker-widget/ui/icons";
import { VNode } from "@mediajel/tracker-widget/vendor";

/**
 * The work order itself: a collapsed paper chip, or the card with its letterhead, its three
 * definition rows and its five numbered sections.
 *
 * This is the shell. The section bodies — Record, Evidence, Code, Verify, Deploy — arrive with
 * the screens; until a handler is passed for one, its row renders in its disabled state rather
 * than pretending to be a control that does nothing.
 */

/** The five sections of the work order and the step each one owns. */
export const SECTIONS: readonly { number: string; label: string; step: WidgetStep }[] = [
  { number: "01", label: "Record", step: "recording" },
  { number: "02", label: "Evidence", step: "review" },
  { number: "03", label: "Code", step: "generating" },
  { number: "04", label: "Verify", step: "verify" },
  { number: "05", label: "Deploy", step: "deploy" },
];

const JOB_TITLES: Record<WidgetGoal, string> = {
  transaction: "Transaction tag",
  signup: "Sign-up tag",
};

export interface AppProps {
  /** The tag's parsed query string — what the operator is looking at, in its own words. */
  context: QueryStringContext;
  session: WidgetSession;
  /** False shows the launcher chip, true the card. */
  open: boolean;
  onToggleOpen(): void;
  /** Absent until the settings overlay exists; the gear renders disabled until then. */
  onOpenSettings?: () => void;
  /** Absent until the section bodies exist; the rows render disabled until then. */
  onSelectSection?: (step: WidgetStep) => void;
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

const Section = ({
  section,
  reached,
  onSelect,
}: {
  section: (typeof SECTIONS)[number];
  reached: boolean;
  onSelect?: (step: WidgetStep) => void;
}): VNode => (
  <li class="mj-section">
    {/* aria-disabled without `disabled`: the row stays in the tab order (keyboard reachable
        everywhere), announces its state, and simply does nothing until its screen exists. */}
    <button
      type="button"
      class="mj-section-row"
      data-reached={String(reached)}
      aria-expanded="false"
      aria-disabled={!onSelect || !reached}
      onClick={onSelect && reached ? () => onSelect(section.step) : undefined}
    >
      <span class="mj-section-number">{section.number}</span>
      <span class="mj-section-label">{section.label}</span>
      <span class="mj-section-state" />
      <ChevronDown class="mj-chevron" />
    </button>
  </li>
);

export const App = ({ context, session, open, onToggleOpen, onOpenSettings, onSelectSection }: AppProps): VNode => {
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
        <span class="mj-chip-label">Work order</span>
      </button>
    );
  }

  const currentIndex = STEP_ORDER.indexOf(session.step);

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

      <Zigzag />

      <ol class="mj-sections">
        {SECTIONS.map((section) => (
          <Section
            key={section.number}
            section={section}
            reached={currentIndex >= STEP_ORDER.indexOf(section.step)}
            onSelect={onSelectSection}
          />
        ))}
      </ol>
    </section>
  );
};

export default App;
