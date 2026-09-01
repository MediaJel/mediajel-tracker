import { WidgetGeneration, WidgetSession } from "@mediajel/assistant-core/types";
import { ReactNode, useState } from "react";

/**
 * Section 03 — Code. Two states: the run in flight (cancelable) and the result: the tag
 * itself (editable — the operator's hand beats the model's), the honest field checklist,
 * and every warning the model or the validator raised. Verify is the only way forward.
 */

export interface CodeSectionProps {
  session: WidgetSession;
  providerLabel: string;
  onCancel(): void;
  onRegenerate(): void;
  onCodeEdit(code: string): void;
  /** "Not the right event" — back to Evidence to point at the moment by hand. */
  onRechoose(): void;
  /** Peeking from a later step: the text is what is running/deployed, so it is frozen. */
  readOnly?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  mapped: "from page",
  derived: "derived",
  default: "default",
  missing: "missing",
};

const Coverage = ({ generation }: { generation: WidgetGeneration }): ReactNode => (
  <dl className="mj-coverage" aria-label="Field coverage">
    {generation.fieldCoverage.map((entry) => (
      <div key={entry.field} className={`mj-cov mj-cov--${entry.status}`}>
        <dt>{entry.field}</dt>
        <dd>
          <span className="mj-cov-status">{STATUS_LABEL[entry.status] ?? entry.status}</span>
          {entry.status === "default" && entry.value ? <em> {entry.value}</em> : null}
          {entry.status === "mapped" && entry.source ? <span className="mj-cov-src"> · {entry.source}</span> : null}
          {entry.note ? <span className="mj-cov-src"> · {entry.note}</span> : null}
        </dd>
      </div>
    ))}
  </dl>
);

export const CodeSection = ({
  session,
  providerLabel,
  onCancel,
  onRegenerate,
  onCodeEdit,
  onRechoose,
  readOnly = false,
}: CodeSectionProps): ReactNode => {
  const [copied, setCopied] = useState(false);
  const generation = session.generation;

  if (session.step === "generating" || !generation) {
    return (
      <div className="mj-section-body">
        <div className="mj-working">
          <span className="mj-rec-dot" aria-hidden="true" />
          <span>{providerLabel} is writing the tag… the evidence left this browser for the first time.</span>
        </div>
        <div className="mj-section-footer">
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const mapped = generation.fieldCoverage.filter(
    (entry) => entry.status === "mapped" || entry.status === "derived",
  ).length;
  const defaults = generation.fieldCoverage.filter((entry) => entry.status === "default").length;
  const missing = generation.fieldCoverage.filter((entry) => entry.status === "missing").length;

  const copy = (): void => {
    void navigator.clipboard?.writeText(generation.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="mj-section-body">
      <p className="mj-lede">{generation.summary}</p>
      <div className="mj-built-from">
        <span className="mj-field-label">Built from</span>
        <span className="mj-built-from-what">{generation.trigger.description}</span>
        {!readOnly && (
          <button type="button" className="mj-link" onClick={onRechoose}>
            Not the right moment? Point at it
          </button>
        )}
      </div>
      <p className="mj-fine">
        Written by {generation.model}
        {generation.edited ? " · edited by you" : ""}
      </p>

      {generation.violations.length > 0 && (
        <div className="mj-notice mj-notice--warn" role="alert">
          {generation.violations.map((violation) => (
            <p key={violation}>{violation}</p>
          ))}
        </div>
      )}
      {generation.warnings.map((warning) => (
        <div key={warning} className="mj-notice mj-notice--warn" role="note">
          <p>{warning}</p>
        </div>
      ))}
      {!generation.items.trackable && (
        <div className="mj-notice mj-notice--warn" role="note">
          <p>
            Items are not trackable here: {generation.items.reason ?? "no item data in the evidence"} — the tag sends
            items: [].
          </p>
        </div>
      )}

      <label className="mj-field">
        <span className="mj-field-label">
          The tag · editable
          <button type="button" className="mj-copy" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
        <textarea
          className="mj-textarea mj-code"
          rows={12}
          spellCheck={false}
          readOnly={readOnly}
          value={generation.code}
          onChange={(event) => onCodeEdit((event.target as HTMLTextAreaElement).value)}
        />
      </label>

      <p className="mj-cov-line">
        {mapped} from the page · {defaults} default{defaults === 1 ? "" : "s"}
        {missing > 0 ? ` · ${missing} missing` : ""}
      </p>
      <Coverage generation={generation} />

      {!readOnly && (
        <div className="mj-section-footer">
          <button type="button" className="mj-btn mj-btn--ghost" onClick={onRegenerate}>
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
};

export default CodeSection;
