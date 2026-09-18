import { ReactNode } from "react";

import { Button } from "~/ui/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * The one next action, pinned to the bottom of the panel, saying what it will do.
 *
 * A primary button that lives inside the open section moves every time that section changes
 * size; pinned here it is in one place all day, and it can afford a line underneath — the
 * consequence of pressing it, or why it cannot be pressed yet. A failure from the flow sits
 * above the button, because the operator's eye is already on the button.
 */
export interface ActionBarProps {
  label: string;
  /** What pressing the button does. Shown unless something blocks the action. */
  consequence: string;
  onClick?(): void;
  tone?: "primary" | "danger";
  /** Why it cannot run. Shown in place of the consequence; the button stays reachable. */
  blocked?: string;
  /** What the button says while its action is in flight, or undefined when nothing is. */
  working?: string;
  error?: string;
}

const VARIANT = { primary: "default", danger: "destructive" } as const;

/** A failure from the flow, in the warning voice, on its own wash. */
const FlowError = ({ error }: { error?: string }): ReactNode =>
  error ? (
    <p
      role="alert"
      className="mt-0 mb-2.5 rounded-sm bg-partner/10 px-2.5 py-2 text-md leading-[1.45] text-warning-text"
    >
      {error}
    </p>
  ) : null;

const ActionButton = ({
  label,
  onClick,
  tone,
  working,
}: Pick<ActionBarProps, "label" | "onClick" | "working"> & { tone: NonNullable<ActionBarProps["tone"]> }) => {
  const busy = Boolean(working);
  return (
    <Button
      variant={VARIANT[tone]}
      className="w-full"
      aria-disabled={busy || !onClick}
      aria-busy={busy}
      working={busy}
      onClick={busy ? undefined : onClick}
    >
      {working ?? label}
    </Button>
  );
};

type Line = Pick<ActionBarProps, "consequence" | "blocked" | "working">;

/** What the line under the button says — and whether it is a warning. */
const consequenceLine = ({ consequence, blocked, working }: Line): { text: string; warning: boolean } => {
  if (working) return { text: "Leave this panel open — it is still working.", warning: false };
  if (blocked) return { text: blocked, warning: true };
  return { text: consequence, warning: false };
};

/** What the button will do — or why it cannot, or, while it works, a plea not to close the panel. */
const Consequence = (line: Line): ReactNode => {
  const { text, warning } = consequenceLine(line);
  return (
    <p
      className={cn("mt-2.5 mb-0 text-md leading-[1.5] text-muted-foreground", warning && "text-warning-text")}
      aria-live="polite"
    >
      {text}
    </p>
  );
};

export const ActionBar = ({ tone = "primary", ...props }: ActionBarProps): ReactNode => (
  <footer className="flex-none bg-sheet px-5 pt-4 pb-5 shadow-bar">
    <FlowError error={props.error} />
    <ActionButton label={props.label} onClick={props.onClick} tone={tone} working={props.working} />
    <Consequence consequence={props.consequence} blocked={props.blocked} working={props.working} />
  </footer>
);
