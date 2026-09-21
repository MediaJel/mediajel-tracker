import { FormEvent, ReactNode, useId, useState } from "react";

import { ENVIRONMENTS } from "@mediajel/assistant-core/simulation";
import { TagRecord } from "@mediajel/assistant-core/tags";

import type { SimulationState } from "~/sidepanel/useSimulation";
import { Eyebrow, Machine } from "~/ui/components/Section";
import { Button } from "~/ui/components/ui/button";
import { Input } from "~/ui/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/ui/components/ui/toggle-group";
import {
  EditField,
  EditGroup,
  Edits,
  PARAM_NAME,
  changeCount,
  consequenceOf,
  editGroups,
  overridesKeyOf,
  released,
  stateOf,
  undone,
  withValue,
} from "~/ui/config-edit";
import { ConfigurationSlip } from "~/ui/screens/ConfigurationSlip";

/**
 * A tag's configuration on the Overview, where it can be changed and tried on the page.
 *
 * Read, it is the configuration slip, with the params an edit being tried marked in the live ink
 * and *Edit* under them. Editing, the groups become fields: every param the tag reads by name, set
 * or not, then whatever else it carries; a changed field says what it was and can be undone, a param
 * an earlier edit set can stop being overridden, and an edit that renames the tag, redirects it or
 * switches it off says so before it is tried. *Try on this page* sends the tag's app ID and the edit
 * to the assistant service, which writes the code — the same block a deploy commits — and the page,
 * reloaded, runs it in this browser only.
 */

const ENVIRONMENT_LIST = "mj-environments";

type Change = (field: EditField, value: string) => void;

interface FieldProps {
  field: EditField;
  draft: Edits;
  start: Edits;
  onValue: Change;
  onDraft(next: Edits): void;
}

/** Version is one of two SDKs; everything else is text, and environment suggests the tag's adapters. */
const FieldInput = ({ field, value, id, onValue }: { field: EditField; value: string; id: string; onValue: Change }) =>
  field.key === "version" ? (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => next && onValue(field, next)}
      aria-label="Version"
      className="w-fit"
    >
      <ToggleGroupItem value="1" className="min-h-[26px] px-2.5 text-xs whitespace-nowrap">
        1 · sp.js
      </ToggleGroupItem>
      <ToggleGroupItem value="2" className="min-h-[26px] px-2.5 text-xs whitespace-nowrap">
        2 · cnna.js
      </ToggleGroupItem>
    </ToggleGroup>
  ) : (
    <Input
      id={id}
      className="min-h-[26px] px-1.5 py-0.5 font-mono text-xs"
      value={value}
      placeholder={field.now ? undefined : "not set"}
      list={field.key === "environment" ? ENVIRONMENT_LIST : undefined}
      spellCheck={false}
      autoComplete="off"
      onChange={(event) => onValue(field, event.target.value)}
    />
  );

const Link = ({ onClick, children }: { onClick(): void; children: ReactNode }): ReactNode => (
  <Button type="button" variant="link" size="none" className="text-xs" onClick={onClick}>
    {children}
  </Button>
);

/** What a field held when the editor opened: the earlier edit's value, else what the tag ran with. */
const wasOf = (field: EditField, start: Edits): string => start[field.key] ?? field.now;

const Legacy = ({ field }: { field: EditField }): ReactNode =>
  field.legacy ? (
    <>
      read from <span className="font-mono">{field.legacy}</span>, its legacy name
    </>
  ) : null;

/** Under a field: what it was and the way back, an earlier edit's standing, or where its value was read from. */
const FieldNote = ({ field, draft, start, onDraft }: Omit<FieldProps, "onValue">): ReactNode => {
  const back = (): void => onDraft(undone(draft, start, field.key));
  const notes: Record<ReturnType<typeof stateOf>, ReactNode> = {
    edited: (
      <>
        <span className="text-primary">edited</span> · was {wasOf(field, start) || "not set"} ·{" "}
        <Link onClick={back}>Undo</Link>
      </>
    ),
    kept: (
      <>
        set by the edit already made · <Link onClick={() => onDraft(released(draft, field.key))}>Stop overriding</Link>
      </>
    ),
    released: (
      <>
        no longer overridden · <Link onClick={back}>Undo</Link>
      </>
    ),
    none: <Legacy field={field} />,
  };
  return (
    <span className="mt-0.5 block font-sans text-muted-foreground empty:hidden">
      {notes[stateOf(draft, start, field.key)]}
    </span>
  );
};

const Consequence = ({ field, value }: { field: EditField; value: string }): ReactNode => {
  const said = consequenceOf(field, value);
  return said ? <span className="mt-0.5 block font-sans text-warning-text">{said}</span> : null;
};

const FieldRow = (props: FieldProps): ReactNode => {
  const id = useId();
  const { field, draft } = props;
  const value = field.key in draft ? draft[field.key] : field.now;
  return (
    <>
      <dt className="pt-1 text-muted-foreground">
        <label htmlFor={id}>{field.label}</label>
      </dt>
      <dd className="m-0">
        <FieldInput field={field} value={value} id={id} onValue={props.onValue} />
        <FieldNote {...props} />
        <Consequence field={field} value={value} />
      </dd>
    </>
  );
};

const FieldGroup = ({ group, ...rest }: Omit<FieldProps, "field"> & { group: EditGroup }): ReactNode => (
  <div className="mt-2.5">
    <Eyebrow className="mb-1 block">{group.title}</Eyebrow>
    <dl className="m-0 grid grid-cols-[9.5rem_1fr] gap-x-3 gap-y-1.5 text-xs">
      {group.fields.map((field) => (
        <FieldRow key={field.key} field={field} {...rest} />
      ))}
    </dl>
  </div>
);

/** A param the tag reads that the slip has no field for: added by name, which must be one a URL could carry. */
const AddParam = ({ onAdd }: { onAdd(name: string, value: string): void }): ReactNode => {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const valid = PARAM_NAME.test(name.trim());
  const add = (): void => {
    if (!valid) return;
    onAdd(name.trim(), value);
    setName("");
    setValue("");
  };
  return (
    <div data-slot="config-add" className="mt-3 grid grid-cols-[9.5rem_1fr_auto] items-center gap-x-3 text-xs">
      <Input
        aria-label="New parameter's name"
        className="min-h-[26px] px-1.5 py-0.5 font-mono text-xs"
        placeholder="parameter"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        aria-label="New parameter's value"
        className="min-h-[26px] px-1.5 py-0.5 font-mono text-xs"
        placeholder="value"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="button" variant="outline" size="xs" aria-disabled={!valid} onClick={add}>
        Add
      </Button>
    </div>
  );
};

/** The edit as the object the block merges into `window.overrides` for this tag. */
const EditObject = ({ overridesKey, draft }: { overridesKey: string; draft: Edits }): ReactNode => {
  const sorted = Object.fromEntries(
    Object.keys(draft)
      .sort()
      .map((key) => [key, draft[key]]),
  );
  return (
    <Machine data-slot="config-object" className="mt-2">
      {`// merged into window.overrides["${overridesKey}"] by the tag's app-id file\n${JSON.stringify(sorted, null, 2)}`}
    </Machine>
  );
};

type Mode = "fields" | "object";

const ModeToggle = ({ mode, onMode }: { mode: Mode; onMode(mode: Mode): void }): ReactNode => (
  <ToggleGroup
    type="single"
    value={mode}
    onValueChange={(next) => next && onMode(next as Mode)}
    aria-label="Edit the configuration as fields, or read it as an object"
    className="mt-1 w-fit"
  >
    <ToggleGroupItem value="fields" className="whitespace-nowrap">
      Fields
    </ToggleGroupItem>
    <ToggleGroupItem value="object" className="whitespace-nowrap">
      Config object
    </ToggleGroupItem>
  </ToggleGroup>
);

const changesLabel = (count: number): string => `Try ${count} ${count === 1 ? "change" : "changes"} on this page`;

interface FormProps {
  tag: TagRecord;
  start: Edits;
  busy: boolean;
  onTry(edits: Edits): void;
  onCancel(): void;
}

const ConfigurationForm = ({ tag, start, busy, onTry, onCancel }: FormProps): ReactNode => {
  const [draft, setDraft] = useState<Edits>(start);
  const [mode, setMode] = useState<Mode>("fields");
  const changes = changeCount(draft, start);
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (changes > 0 && !busy) onTry(draft);
  };
  const onValue: Change = (field, value) => setDraft((current) => withValue(current, start, field, value));
  return (
    <form data-slot="config-edit" className="pb-1" onSubmit={submit}>
      <ModeToggle mode={mode} onMode={setMode} />
      {mode === "fields" ? (
        <>
          {editGroups(tag, draft).map((group) => (
            <FieldGroup
              key={group.title}
              group={group}
              draft={draft}
              start={start}
              onValue={onValue}
              onDraft={setDraft}
            />
          ))}
          <AddParam onAdd={(name, value) => setDraft((current) => ({ ...current, [name]: value }))} />
        </>
      ) : (
        <EditObject overridesKey={overridesKeyOf(tag)} draft={draft} />
      )}
      <datalist id={ENVIRONMENT_LIST}>
        {ENVIRONMENTS.map((environment) => (
          <option key={environment} value={environment} />
        ))}
      </datalist>
      <p className="mt-3 mb-2.5 text-xs text-privacy">
        Trying sends this tag’s app ID and the edit to MediaJel’s assistant service, which writes the code; the page
        then runs it in this browser only.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" aria-disabled={changes === 0 || busy} working={busy}>
          {changes === 0 ? "Nothing changed yet" : changesLabel(changes)}
        </Button>
        <Link onClick={onCancel}>Cancel</Link>
      </div>
    </form>
  );
};

const editsCount = (count: number): string => `${count} ${count === 1 ? "edit" : "edits"}`;

/** What is being tried on the page, said beside the disclosure so it shows closed as well as open. */
const TriedNote = ({ count }: { count: number }): ReactNode =>
  count > 0 ? (
    <span data-slot="tag-config-tried" className="text-xs text-primary">
      {editsCount(count)} tried on this page
    </span>
  ) : null;

interface ActionsProps {
  trying: boolean;
  late: boolean;
  opening: boolean;
  error: string;
  onEdit(): void;
  onStop(): void;
  onApplyAgain(): void;
}

const LateLine = ({ late, onApplyAgain }: Pick<ActionsProps, "late" | "onApplyAgain">): ReactNode =>
  late ? (
    <p data-slot="tag-config-late" className="mt-0 mb-2 text-xs text-warning-text">
      This tag read its configuration before the edit reached the page. <Link onClick={onApplyAgain}>Apply again</Link>
    </p>
  ) : null;

const ErrorLine = ({ error }: { error: string }): ReactNode =>
  error ? (
    <p role="alert" className="mt-2 mb-0 text-xs text-warning-text">
      {error}
    </p>
  ) : null;

const EditButton = ({ opening, onEdit }: Pick<ActionsProps, "opening" | "onEdit">): ReactNode => (
  <Button type="button" variant="outline" size="xs" aria-disabled={opening} working={opening} onClick={onEdit}>
    {opening ? "Reading the deployed configuration…" : "Edit"}
  </Button>
);

/** Under the read configuration: edit it, stop trying an edit, or start the page again when the tag read it too early. */
const SlipActions = (props: ActionsProps): ReactNode => (
  <div className="mt-3">
    <LateLine late={props.late} onApplyAgain={props.onApplyAgain} />
    <div className="flex items-center gap-3">
      <EditButton opening={props.opening} onEdit={props.onEdit} />
      {props.trying && <Link onClick={props.onStop}>Stop trying the edit</Link>}
    </div>
    <ErrorLine error={props.error} />
  </div>
);

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Where an editor starts: the edit tried on the page, else the one deployed to the tag's app-id file. */
const useEditing = (key: string, tried: Edits | undefined, simulation: SimulationState) => {
  const [start, setStart] = useState<Edits | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const open = async (): Promise<void> => {
    if (tried) {
      setStart(tried);
      return;
    }
    setOpening(true);
    setError("");
    try {
      setStart((await simulation.deployedEdits(key)) ?? {});
    } catch (err) {
      setError(message(err));
    } finally {
      setOpening(false);
    }
  };
  return { start, opening, error, open, close: () => setStart(null) };
};

/** The edit tried on the page for this tag — its params — or none; a background older than the panel sends no `tried` at all. */
const triedOf = (simulation: SimulationState, key: string): Edits => simulation.simulation?.tried?.[key]?.edits ?? {};

const isLate = (simulation: SimulationState, key: string): boolean => simulation.page?.late.includes(key) ?? false;

type Editing = ReturnType<typeof useEditing>;

interface PartProps {
  tag: TagRecord;
  overridesKey: string;
  tried: Edits;
  editing: Editing;
  simulation: SimulationState;
}

/** The form, while the configuration is being edited. */
const EditingForm = ({ tag, overridesKey, editing, simulation }: PartProps): ReactNode => {
  if (!editing.start) return null;
  const onTry = (edits: Edits): void => {
    simulation.tryEdits(overridesKey, edits);
    editing.close();
  };
  return (
    <ConfigurationForm tag={tag} start={editing.start} busy={simulation.busy} onTry={onTry} onCancel={editing.close} />
  );
};

/** The actions, while it is read. */
const ReadingActions = ({ overridesKey, tried, editing, simulation }: PartProps): ReactNode =>
  editing.start ? null : (
    <SlipActions
      trying={Object.keys(tried).length > 0}
      late={isLate(simulation, overridesKey)}
      opening={editing.opening}
      error={editing.error || simulation.error}
      onEdit={() => void editing.open()}
      onStop={() => simulation.tryEdits(overridesKey, {})}
      onApplyAgain={simulation.reloadPage}
    />
  );

export const EditableConfiguration = ({
  tag,
  simulation,
}: {
  tag: TagRecord;
  simulation: SimulationState;
}): ReactNode => {
  const overridesKey = overridesKeyOf(tag);
  const tried = triedOf(simulation, overridesKey);
  const trying = Object.keys(tried).length > 0;
  const editing = useEditing(overridesKey, trying ? tried : undefined, simulation);
  const parts: PartProps = { tag, overridesKey, tried, editing, simulation };
  return (
    <ConfigurationSlip
      tag={tag}
      note={<TriedNote count={Object.keys(tried).length} />}
      tried={new Set(Object.keys(tried))}
      editing={editing.start ? <EditingForm {...parts} /> : undefined}
      footer={<ReadingActions {...parts} />}
    />
  );
};
