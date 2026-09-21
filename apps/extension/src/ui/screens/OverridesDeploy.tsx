import { ReactNode, useEffect, useRef, useState } from "react";

import { TriedEdit } from "@mediajel/assistant-core/simulation";

import type { SimulationState } from "~/sidepanel/useSimulation";
import type { OverridesPreview } from "~/service/client";
import { Chevron } from "~/ui/components/Chevron";
import { Eyebrow, Fine, Machine } from "~/ui/components/Section";
import Stamp from "~/ui/components/Stamp";
import { Button } from "~/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { deployLine } from "~/ui/overrides-deploy";

/**
 * Deploying a tried edit: the tag's app-id file as the commit would leave it, before anything is
 * committed — its path, what the commit does to it in one sentence, the block itself, and the whole
 * file one disclosure down — then one line in privacy purple saying where it goes, and the button.
 * Committed, the filled DEPLOYED stamp and the commit; the page keeps running the edit until the
 * tag's CDN serves the file that carries it.
 */

const TextButton = ({ onClick, children }: { onClick(): void; children: ReactNode }): ReactNode => (
  <Button type="button" variant="link" size="none" className="text-xs" onClick={onClick}>
    {children}
  </Button>
);

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** The file as the commit leaves it, one disclosure down: its own code first, then the block. */
const WholeFile = ({ after }: { after: string }): ReactNode => (
  <Collapsible className="mt-1.5">
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="none"
        className="group -ml-1 gap-[3px] py-[3px] pl-1 font-display text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:text-foreground"
      >
        The whole file
        <Chevron className="group-aria-expanded:rotate-180" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Machine>{after || "(empty)"}</Machine>
    </CollapsibleContent>
  </Collapsible>
);

/** What the commit does, before it is made. */
const Plan = ({ preview }: { preview: OverridesPreview }): ReactNode => (
  <>
    <p className="mt-1 mb-1 font-mono text-xs wrap-anywhere text-foreground">{preview.path}</p>
    <Fine className="mb-1.5">{deployLine(preview)}</Fine>
    <Machine data-slot="overrides-block">{preview.block ?? "(the block comes out)"}</Machine>
    <WholeFile after={preview.after} />
  </>
);

const PlanOrWait = ({ preview, error }: { preview: OverridesPreview | null; error: string }): ReactNode => {
  if (preview) return <Plan preview={preview} />;
  return error ? null : <Fine className="mt-1">Reading the tag’s app-id file…</Fine>;
};

const ErrorLine = ({ error }: { error: string }): ReactNode =>
  error ? (
    <p role="alert" className="mt-2 mb-0 text-xs text-warning-text">
      {error}
    </p>
  ) : null;

/** The preview of this edit's commit, read once when the receipt opens. */
const usePreview = (overridesKey: string, tried: TriedEdit, simulation: SimulationState) => {
  const [preview, setPreview] = useState<OverridesPreview | null>(null);
  const [error, setError] = useState("");
  const ask = useRef(simulation.previewEdit);
  ask.current = simulation.previewEdit;
  const { edits, version } = tried;
  useEffect(() => {
    let current = true;
    ask
      .current(overridesKey, edits)
      .then((read) => current && setPreview(read))
      .catch((err) => current && setError(message(err)));
    return () => {
      current = false;
    };
  }, [overridesKey, version, edits]);
  return { preview, error, setError };
};

interface ReceiptProps {
  overridesKey: string;
  tried: TriedEdit;
  simulation: SimulationState;
  onClose(): void;
}

export const DeployReceipt = ({ overridesKey, tried, simulation, onClose }: ReceiptProps): ReactNode => {
  const { preview, error, setError } = usePreview(overridesKey, tried, simulation);
  const [busy, setBusy] = useState(false);
  const deploy = async (): Promise<void> => {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    try {
      await simulation.deployEdit(overridesKey, preview.sha);
      onClose();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-slot="overrides-deploy" className="mt-3 border-t border-border pt-2.5">
      <Eyebrow className="block">Deploy the edit</Eyebrow>
      <PlanOrWait preview={preview} error={error} />
      <ErrorLine error={error} />
      <p className="mt-2.5 mb-2.5 text-xs text-privacy">
        Commits to master of the frictionless repo as you, with MediaJel’s credential; the tag’s CDN serves it within
        minutes.
      </p>
      <div className="flex items-center gap-3">
        <Button type="button" aria-disabled={!preview || busy} working={busy} onClick={() => void deploy()}>
          {busy ? "Deploying…" : "Deploy"}
        </Button>
        <TextButton onClick={onClose}>Cancel</TextButton>
      </div>
    </div>
  );
};

/** A committed edit, stamped, with its commit — said until the tag's CDN serves it and it is no longer tried. */
export const DeployedLine = ({ tried }: { tried: TriedEdit }): ReactNode =>
  tried.deployed ? (
    <p data-slot="overrides-deployed" className="mt-0 mb-2 text-xs text-muted-foreground">
      <Stamp label="Deployed" tone="platform" filled />{" "}
      <a href={tried.deployed.commitUrl} target="_blank" rel="noreferrer" className="text-primary underline">
        The commit
      </a>{" "}
      · The tag’s CDN serves it within minutes; this page runs the edit from here until then.
    </p>
  ) : null;
