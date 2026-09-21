import { FormEvent, KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";

import { ENVIRONMENTS, TriedEdit } from "@mediajel/assistant-core/simulation";
import { TagRecord } from "@mediajel/assistant-core/tags";

import type { SimulationState } from "~/sidepanel/useSimulation";
import { Eyebrow, Machine } from "~/ui/components/Section";
import { Button } from "~/ui/components/ui/button";
import { Input } from "~/ui/components/ui/input";
import { Textarea } from "~/ui/components/ui/textarea";
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
import { DeployReceipt, DeployedLine } from "~/ui/screens/OverridesDeploy";
import { triedLine } from "~/ui/overrides-deploy";

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

/** Enter never sends an edit: only the Try button does. */
const holdEnter = (event: KeyboardEvent): void => {
  if (event.key === "Enter") event.preventDefault();
};

interface InputProps {
  field: EditField;
  value: string;
  id: string;
  labelId: string;
  onValue: Change;
}

/**
 * A value on as many lines as it needs — a Nexxen segment is ninety characters — and never a line
 * break. A block, because a textarea's baseline is its bottom edge: inline, it would carry a
 * descender's space under it and open every row wider than the inputs'.
 */
const Words = ({ field, value, id, onValue }: InputProps): ReactNode => (
  <Textarea
    id={id}
    rows={1}
    className="block min-h-[26px] resize-none px-1.5 py-0.5 text-xs field-sizing-content wrap-anywhere"
    value={value}
    placeholder={field.now ? undefined : "not set"}
    spellCheck={false}
    autoComplete="off"
    onKeyDown={holdEnter}
    onChange={(event) => onValue(field, event.target.value.replace(/[\r\n]+/g, ""))}
  />
);

/** Environment is short, and suggests the tag's adapters. */
const Environment = ({ field, value, id, onValue }: InputProps): ReactNode => (
  <Input
    id={id}
    className="min-h-[26px] px-1.5 py-0.5 font-mono text-xs"
    value={value}
    placeholder={field.now ? undefined : "not set"}
    list={ENVIRONMENT_LIST}
    spellCheck={false}
    autoComplete="off"
    onKeyDown={holdEnter}
    onChange={(event) => onValue(field, event.target.value)}
  />
);

/** Version is one of two SDKs, labelled by the field's own label. */
const Version = ({ field, value, labelId, onValue }: InputProps): ReactNode => (
  <ToggleGroup
    type="single"
    value={value}
    onValueChange={(next) => next && onValue(field, next)}
    aria-labelledby={labelId}
    className="w-fit"
  >
    <ToggleGroupItem value="1" className="min-h-[26px] px-2.5 text-xs whitespace-nowrap">
      1 · sp.js
    </ToggleGroupItem>
    <ToggleGroupItem value="2" className="min-h-[26px] px-2.5 text-xs whitespace-nowrap">
      2 · cnna.js
    </ToggleGroupItem>
  </ToggleGroup>
);

const INPUTS: Record<string, (props: InputProps) => ReactNode> = { version: Version, environment: Environment };

const FieldInput = (props: InputProps): ReactNode => (INPUTS[props.field.key] ?? Words)(props);

/** A link set at the size of the text or button beside it. */
const Link = ({
  onClick,
  size = "text-xs",
  id,
  children,
}: {
  onClick(): void;
  size?: string;
  id?: string;
  children: ReactNode;
}): ReactNode => (
  <Button id={id} type="button" variant="link" size="none" className={size} onClick={onClick}>
    {children}
  </Button>
);

/** A note's action, on a line of its own, so the narrow column never breaks the note at a separator. */
const NoteAction = ({ onClick, children }: { onClick(): void; children: ReactNode }): ReactNode => (
  <span className="block">
    <Link onClick={onClick}>{children}</Link>
  </span>
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
        <span className="text-primary">edited</span> · was {wasOf(field, start) || "not set"}
        <NoteAction onClick={back}>Undo</NoteAction>
      </>
    ),
    kept: (
      <>
        set by the edit already made
        <NoteAction onClick={() => onDraft(released(draft, field.key))}>Stop overriding</NoteAction>
      </>
    ),
    released: (
      <>
        no longer overridden
        <NoteAction onClick={back}>Undo</NoteAction>
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
  const labelId = useId();
  const { field, draft } = props;
  const value = field.key in draft ? draft[field.key] : field.now;
  return (
    <>
      <dt className="pt-1 text-muted-foreground">
        <label id={labelId} htmlFor={id}>
          {field.label}
        </label>
      </dt>
      <dd className="m-0">
        <FieldInput field={field} value={value} id={id} labelId={labelId} onValue={props.onValue} />
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

/** Why a name was refused, once there is a name to refuse. */
const NameRefused = ({ name, valid }: { name: string; valid: boolean }): ReactNode =>
  name.trim() && !valid ? (
    <p className="mt-1 mb-0 text-xs text-warning-text">
      A parameter’s name is letters, numbers, dots, dashes and underscores, at most 64 of them.
    </p>
  ) : null;

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
  /** Enter in the row adds the parameter; it never sends the edit. */
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add();
  };
  return (
    <div data-slot="config-add" className="mt-3">
      <div className="grid grid-cols-[9.5rem_1fr_auto] items-center gap-x-3 text-xs">
        <Input
          aria-label="New parameter's name"
          className="min-h-[26px] px-1.5 py-0.5 font-mono text-xs"
          placeholder="parameter"
          value={name}
          onKeyDown={onKeyDown}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          aria-label="New parameter's value"
          className="min-h-[26px] px-1.5 py-0.5 font-mono text-xs"
          placeholder="value"
          value={value}
          onKeyDown={onKeyDown}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="button" variant="outline" size="xs" aria-disabled={!valid} onClick={add}>
          Add
        </Button>
      </div>
      <NameRefused name={name} valid={valid} />
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

/** A form's first field, focused as the form opens — Edit put the operator here. */
const useFirstField = () => {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    form.current?.querySelector<HTMLElement>("textarea, input, [role=radio]")?.focus();
  }, []);
  return form;
};

const ConfigurationForm = ({ tag, start, busy, onTry, onCancel }: FormProps): ReactNode => {
  const [draft, setDraft] = useState<Edits>(start);
  const [mode, setMode] = useState<Mode>("fields");
  const form = useFirstField();
  const changes = changeCount(draft, start);
  const send = (): void => {
    if (changes > 0 && !busy) onTry(draft);
  };
  const onValue: Change = (field, value) => setDraft((current) => withValue(current, start, field, value));
  return (
    <form ref={form} data-slot="config-edit" className="pb-1" onSubmit={(event: FormEvent) => event.preventDefault()}>
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
        <Button type="button" aria-disabled={changes === 0 || busy} working={busy} onClick={send}>
          {changes === 0 ? "Nothing changed yet" : changesLabel(changes)}
        </Button>
        <Link onClick={onCancel} size="text-base">
          Cancel
        </Link>
      </div>
    </form>
  );
};

/** What is being tried on the page, said beside the disclosure so it shows closed as well as open. */
const TriedNote = ({ tried }: { tried: TriedEdit | undefined }): ReactNode => {
  const line = triedLine(tried);
  return line ? (
    <span data-slot="tag-config-tried" className="text-xs text-primary">
      {line}
    </span>
  ) : null;
};

/** Where focus goes when the control that had it goes away. */
interface Ids {
  edit: string;
  deploy: string;
  receipt: string;
}

/** Focuses an element once the render that brings it has painted. */
const focusSoon = (id: string): void => {
  requestAnimationFrame(() => document.getElementById(id)?.focus());
};

interface ActionsProps {
  ids: Ids;
  tried: TriedEdit | undefined;
  late: boolean;
  opening: boolean;
  error: string;
  onEdit(): void;
  onDeploy(): void;
  onStop(): void;
  onApplyAgain(): void;
}

const LateLine = ({ late, onApplyAgain }: Pick<ActionsProps, "late" | "onApplyAgain">): ReactNode =>
  late ? (
    <p data-slot="tag-config-late" className="mt-0 mb-2 text-xs text-warning-text">
      This tag read its configuration before the edit reached the page, so it is running without the edit.{" "}
      <Link onClick={onApplyAgain}>Apply again</Link>
    </p>
  ) : null;

const ErrorLine = ({ error }: { error: string }): ReactNode =>
  error ? (
    <p role="alert" className="mt-2 mb-0 text-xs text-warning-text">
      {error}
    </p>
  ) : null;

const EditButton = ({ opening, onEdit, ids }: Pick<ActionsProps, "opening" | "onEdit" | "ids">): ReactNode => (
  <Button
    id={ids.edit}
    type="button"
    variant="outline"
    size="xs"
    aria-disabled={opening}
    working={opening}
    onClick={onEdit}
  >
    {opening ? "Reading the deployed configuration…" : "Edit"}
  </Button>
);

/** A tried edit not yet committed can be deployed; one already committed waits for the CDN. */
const DeployButton = ({ tried, onDeploy, ids }: Pick<ActionsProps, "tried" | "onDeploy" | "ids">): ReactNode =>
  tried && !tried.deployed ? (
    <Button id={ids.deploy} type="button" variant="outline" size="xs" onClick={onDeploy}>
      Deploy…
    </Button>
  ) : null;

/** Under the read configuration: edit it, deploy the edit tried, stop trying it, or start the page again when the tag read it too early. */
const SlipActions = (props: ActionsProps): ReactNode => (
  <div className="mt-3">
    {props.tried && <DeployedLine tried={props.tried} />}
    <LateLine late={props.late} onApplyAgain={props.onApplyAgain} />
    <div className="flex items-center gap-3">
      <EditButton opening={props.opening} onEdit={props.onEdit} ids={props.ids} />
      <DeployButton tried={props.tried} onDeploy={props.onDeploy} ids={props.ids} />
      {props.tried && (
        <Link onClick={props.onStop} size="text-sm">
          Stop trying the edit
        </Link>
      )}
    </div>
    <ErrorLine error={props.error} />
  </div>
);

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Where an editor starts: the edit tried on the page, else the one deployed to the tag's app-id file. */
const useEditing = (key: string, tried: TriedEdit | undefined, simulation: SimulationState) => {
  const [start, setStart] = useState<Edits | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const open = async (): Promise<void> => {
    if (tried) {
      setStart(tried.edits);
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

/** The edit tried on the page for this tag, or none; a background older than the panel sends no `tried` at all. */
const triedOf = (simulation: SimulationState, key: string): TriedEdit | undefined =>
  simulation.simulation?.tried?.[key];

const isLate = (simulation: SimulationState, key: string): boolean => simulation.page?.late.includes(key) ?? false;

type Editing = ReturnType<typeof useEditing>;

interface PartProps {
  ids: Ids;
  tag: TagRecord;
  overridesKey: string;
  tried: TriedEdit | undefined;
  editing: Editing;
  deploying: { open: boolean; set(open: boolean): void };
  simulation: SimulationState;
}

/** The form, while the configuration is being edited; closing it hands focus back to Edit. */
const EditingForm = ({ ids, tag, overridesKey, editing, simulation }: PartProps): ReactNode => {
  if (!editing.start) return null;
  const close = (): void => {
    editing.close();
    focusSoon(ids.edit);
  };
  const onTry = (edits: Edits): void => {
    simulation.tryEdits(overridesKey, edits);
    close();
  };
  return <ConfigurationForm tag={tag} start={editing.start} busy={simulation.busy} onTry={onTry} onCancel={close} />;
};

/** The actions while it is read. */
const ReadActions = ({ ids, overridesKey, tried, editing, deploying, simulation }: PartProps): ReactNode => (
  <SlipActions
    ids={ids}
    tried={tried}
    late={isLate(simulation, overridesKey)}
    opening={editing.opening}
    error={editing.error || simulation.error}
    onEdit={() => void editing.open()}
    onDeploy={() => {
      deploying.set(true);
      focusSoon(ids.receipt);
    }}
    onStop={() => simulation.stopTrying(overridesKey)}
    onApplyAgain={simulation.reloadPage}
  />
);

/** Under the groups while they are read: the actions — or, once Deploy is asked for, the deploy's receipt in their place. */
const ReadingActions = (props: PartProps): ReactNode => {
  if (props.editing.start) return null;
  const { tried, deploying } = props;
  // Cancelled, focus goes back to Deploy…; committed, Deploy… is gone, so to Edit.
  const close = (deployed: boolean): void => {
    deploying.set(false);
    focusSoon(deployed ? props.ids.edit : props.ids.deploy);
  };
  return deploying.open && tried ? (
    <DeployReceipt
      headingId={props.ids.receipt}
      overridesKey={props.overridesKey}
      tried={tried}
      simulation={props.simulation}
      onClose={close}
    />
  ) : (
    <ReadActions {...props} />
  );
};

const NO_KEYS: ReadonlySet<string> = new Set();

export const EditableConfiguration = ({
  tag,
  simulation,
}: {
  tag: TagRecord;
  simulation: SimulationState;
}): ReactNode => {
  const overridesKey = overridesKeyOf(tag);
  const tried = triedOf(simulation, overridesKey);
  const editing = useEditing(overridesKey, tried, simulation);
  const [deployOpen, setDeployOpen] = useState(false);
  const ids: Ids = { edit: useId(), deploy: useId(), receipt: useId() };
  const parts: PartProps = {
    ids,
    tag,
    overridesKey,
    tried,
    editing,
    deploying: { open: deployOpen, set: setDeployOpen },
    simulation,
  };
  return (
    <ConfigurationSlip
      tag={tag}
      note={<TriedNote tried={tried} />}
      tried={tried ? new Set(Object.keys(tried.edits)) : NO_KEYS}
      editing={editing.start ? <EditingForm {...parts} /> : undefined}
      footer={<ReadingActions {...parts} />}
    />
  );
};
