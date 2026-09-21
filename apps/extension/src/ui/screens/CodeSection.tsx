import { WidgetGeneration, WidgetSession } from "@mediajel/assistant-core/types";
import { ReactNode, useId, useState } from "react";

import { cn } from "~/lib/utils";
import { Eyebrow, Fine, Lede, SectionBody, SectionFooter, Working } from "~/ui/components/Section";
import { Alert } from "~/ui/components/ui/alert";
import { Button } from "~/ui/components/ui/button";
import { Field, FieldLabel } from "~/ui/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/ui/components/ui/table";
import { Textarea } from "~/ui/components/ui/textarea";

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

type Entry = WidgetGeneration["fieldCoverage"][number];
type Status = Entry["status"];

/** The status word, and its ink: platform for what came from the page, soft for a default, warning for a hole. */
const STATUS: Record<Status, { label: string; ink: string }> = {
  mapped: { label: "from page", ink: "text-platform-text" },
  derived: { label: "derived", ink: "text-platform-text" },
  default: { label: "default", ink: "text-muted-foreground" },
  missing: { label: "missing", ink: "text-warning-text" },
};

/** What follows the status: a default's value in mono, or the page source a mapped field came from. */
const DETAIL: Record<Status, (entry: Entry) => { mono?: string | null; soft?: string | null }> = {
  mapped: (entry) => ({ soft: entry.source }),
  derived: () => ({}),
  default: (entry) => ({ mono: entry.value }),
  missing: () => ({}),
};

/** A status this build does not know — a record written by another version — is shown as it came, in soft ink. */
const statusOf = (entry: Entry): { label: string; ink: string } =>
  STATUS[entry.status] ?? { label: entry.status, ink: "text-muted-foreground" };

const detailOf = (entry: Entry): { mono?: string | null; soft?: string | null } =>
  (DETAIL[entry.status] ?? (() => ({})))(entry);

const CoverageRow = ({ entry }: { entry: Entry }): ReactNode => {
  const status = statusOf(entry);
  const { mono, soft } = detailOf(entry);
  return (
    <TableRow>
      <TableHead scope="row" className="w-24 font-mono">
        {entry.field}
      </TableHead>
      <TableCell>
        <span className={cn("font-display text-3xs tracking-label uppercase", status.ink)}>{status.label}</span>
        {mono && <em className="font-mono text-muted-foreground not-italic"> {mono}</em>}
        {soft && <span className="text-muted-foreground"> · {soft}</span>}
        {entry.note && <span className="text-muted-foreground"> · {entry.note}</span>}
      </TableCell>
    </TableRow>
  );
};

/** `field · STATUS · source/value`, one row per field the tag needs. */
const Coverage = ({ generation }: { generation: WidgetGeneration }): ReactNode => (
  <Table aria-label="Field coverage" className="mb-3">
    <TableHeader className="sr-only">
      <TableRow>
        <TableHead scope="col">Field</TableHead>
        <TableHead scope="col">Where it came from</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {generation.fieldCoverage.map((entry) => (
        <CoverageRow key={entry.field} entry={entry} />
      ))}
    </TableBody>
  </Table>
);

const tally = (generation: WidgetGeneration): string => {
  const by = (test: (entry: Entry) => boolean): number => generation.fieldCoverage.filter(test).length;
  const mapped = by((entry) => entry.status === "mapped" || entry.status === "derived");
  const defaults = by((entry) => entry.status === "default");
  const missing = by((entry) => entry.status === "missing");
  return `${mapped} from the page · ${defaults} default${defaults === 1 ? "" : "s"}${
    missing > 0 ? ` · ${missing} missing` : ""
  }`;
};

/** Every warning the model or the validator raised, each on its own slip. */
const Warnings = ({ generation }: { generation: WidgetGeneration }): ReactNode => (
  <>
    {generation.violations.length > 0 && (
      <Alert tone="warn" role="alert" className="mb-3">
        {generation.violations.map((violation) => (
          <p key={violation}>{violation}</p>
        ))}
      </Alert>
    )}
    {generation.warnings.map((warning) => (
      <Alert key={warning} tone="warn" role="note" className="mb-3">
        <p>{warning}</p>
      </Alert>
    ))}
    {!generation.items.trackable && (
      <Alert tone="warn" role="note" className="mb-3">
        <p>
          Items are not trackable here: {generation.items.reason ?? "no item data in the evidence"} — the tag sends
          items: [].
        </p>
      </Alert>
    )}
  </>
);

/** The tag, editable, with its Copy at the label's right. */
const TagEditor = ({
  generation,
  readOnly,
  onCodeEdit,
}: {
  generation: WidgetGeneration;
  readOnly: boolean;
  onCodeEdit(code: string): void;
}): ReactNode => {
  const id = useId();
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard?.writeText(generation.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Field className="mb-2.5">
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={id}>The tag · editable</FieldLabel>
        <Button
          variant="outline"
          size="xs"
          className="min-h-0 px-1.5 text-2xs font-normal tracking-[0.06em]"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Textarea
        id={id}
        className="min-h-[180px] overflow-x-auto bg-stock text-xs leading-[1.5] whitespace-pre"
        rows={12}
        spellCheck={false}
        readOnly={readOnly}
        value={generation.code}
        onChange={(event) => onCodeEdit(event.currentTarget.value)}
      />
    </Field>
  );
};

export const CodeSection = ({
  session,
  providerLabel,
  onCancel,
  onRegenerate,
  onCodeEdit,
  onRechoose,
  readOnly = false,
}: CodeSectionProps): ReactNode => {
  const generation = session.generation;

  if (session.step === "generating" || !generation) {
    return (
      <SectionBody>
        <Working>{providerLabel} is writing the tag… the evidence left this browser for the first time.</Working>
        <SectionFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </SectionFooter>
      </SectionBody>
    );
  }

  return (
    <SectionBody>
      <Lede>{generation.summary}</Lede>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <Eyebrow>Built from</Eyebrow>
        <span className="font-semibold">{generation.trigger.description}</span>
        {!readOnly && (
          <Button type="button" variant="link" size="none" onClick={onRechoose}>
            Not the right moment? Point at it
          </Button>
        )}
      </div>
      <Fine>
        Written by {generation.model}
        {generation.edited ? " · edited by you" : ""}
      </Fine>

      <Warnings generation={generation} />
      <TagEditor generation={generation} readOnly={readOnly} onCodeEdit={onCodeEdit} />

      <p className="mt-0 mb-1.5 font-mono text-xs text-muted-foreground">{tally(generation)}</p>
      <Coverage generation={generation} />

      {!readOnly && (
        <SectionFooter>
          <Button type="button" variant="outline" onClick={onRegenerate}>
            Regenerate
          </Button>
        </SectionFooter>
      )}
    </SectionBody>
  );
};

export default CodeSection;
