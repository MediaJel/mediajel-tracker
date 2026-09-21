import { FormEvent, ReactNode, useState } from "react";

import { ParsedTagUrl, SiteSimulation, parseTagUrl } from "@mediajel/assistant-core/simulation";

import { cn } from "~/lib/utils";
import { TAG_SEARCH } from "~/lib/tags";
import type { SimulationState } from "~/sidepanel/useSimulation";
import { Chevron } from "~/ui/components/Chevron";
import { Machine } from "~/ui/components/Section";
import Stamp from "~/ui/components/Stamp";
import { Button } from "~/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { Field, FieldLabel } from "~/ui/components/ui/field";
import { Input } from "~/ui/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/ui/components/ui/toggle-group";
import { ConfigurationGroups } from "~/ui/screens/ConfigurationSlip";
import { STATUS_LINES, SimulatedStatus, TagUrl, urlConfiguration } from "~/ui/simulator";

/**
 * The simulator: the Overview's first section, above Tag activity.
 *
 * A tag installed on this site from its URL, in this browser only, on every page until it is
 * paused or removed — how an engineer tries a tag before a client has installed anything. Closed,
 * it is one line in the section-heading voice, so on a site that has its tag it never outweighs the
 * readings. Opened, it is the URL field and, once the URL reads as a MediaJel tag, the tag's
 * configuration in the slip's own groups or as the object the tag builds from its URL. Simulating,
 * it is a record: a stamp, the app ID, where it loads, and what became of it on this page — said
 * from what the page's tags actually did, never assumed.
 */

interface Props {
  site: string;
  simulation: SimulationState;
  /** Where the URL field starts: the last URL simulated, else this build's tag. */
  lastUrl: string;
}

/** The section heading, in the voice of "Tag activity" below it. */
const HEADING = "m-0 font-display text-xs font-semibold tracking-caps text-muted-foreground uppercase";

const ConfigObject = ({ params }: { params: Record<string, string> }): ReactNode => {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(params, null, 2);
  const copy = (): void => {
    void navigator.clipboard?.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="mt-2">
      <Machine data-slot="config-object">{json}</Machine>
      <Button type="button" variant="link" size="none" className="mt-1.5 text-sm" onClick={copy}>
        {copied ? "Copied" : "Copy the object"}
      </Button>
    </div>
  );
};

type ConfigMode = "fields" | "object";

/** A readable URL's configuration: the slip's groups, or the object the tag builds from the URL. */
const UrlConfiguration = ({ tag }: { tag: TagUrl }): ReactNode => {
  const [mode, setMode] = useState<ConfigMode>("fields");
  return (
    <div data-slot="simulator-config" className="mt-3">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(next) => next && setMode(next as ConfigMode)}
        aria-label="Show the configuration as fields or as an object"
        className="w-fit"
      >
        <ToggleGroupItem value="fields" className="whitespace-nowrap">
          Fields
        </ToggleGroupItem>
        <ToggleGroupItem value="object" className="whitespace-nowrap">
          Config object
        </ToggleGroupItem>
      </ToggleGroup>
      {mode === "fields" ? <ConfigurationGroups view={urlConfiguration(tag)} /> : <ConfigObject params={tag.params} />}
    </div>
  );
};

/** What the action failed with, where the operator is looking. */
const Failure = ({ error }: { error: string }): ReactNode =>
  error ? (
    <p role="alert" className="mt-2 mb-0 text-sm text-warning-text">
      {error}
    </p>
  ) : null;

/** Why a URL cannot be simulated — once the operator has written one, not at the prefilled start. */
const Refusal = ({ parsed, touched }: { parsed: ParsedTagUrl; touched: boolean }): ReactNode =>
  parsed.ok || !parsed.reason || !touched ? null : (
    <p data-slot="simulator-refusal" className="mt-1.5 mb-0 text-xs text-warning-text">
      {parsed.reason}
    </p>
  );

const SimulateButton = ({ site, ready, busy }: { site: string; ready: boolean; busy: boolean }): ReactNode => (
  <Button type="submit" aria-disabled={!ready || busy} working={busy}>
    {busy ? "Loading the tag…" : `Simulate on ${site}`}
  </Button>
);

const SimulateForm = ({ site, simulation, lastUrl }: Props): ReactNode => {
  const [url, setUrl] = useState(lastUrl);
  const [touched, setTouched] = useState(false);
  const parsed = parseTagUrl(url, TAG_SEARCH);
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    setTouched(true);
    if (parsed.ok && !simulation.busy) simulation.install(parsed.url);
  };
  const edit = (next: string): void => {
    setUrl(next);
    setTouched(true);
  };
  return (
    <form data-slot="simulator-form" className="pt-1 pb-4" onSubmit={submit}>
      <Field>
        <FieldLabel htmlFor="mj-simulate-url">Tag URL</FieldLabel>
        <Input
          id="mj-simulate-url"
          className="font-mono text-xs"
          value={url}
          onChange={(event) => edit(event.target.value)}
          placeholder="https://tags.cnna.io/?appId=…"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>
      <Refusal parsed={parsed} touched={touched} />
      {parsed.ok && <UrlConfiguration tag={parsed} />}
      <p className="mt-3 mb-2.5 text-xs text-privacy">
        Loads on every page of {site} in this browser, and sends to MediaJel’s collector as an installed tag would.
      </p>
      <SimulateButton site={site} ready={parsed.ok} busy={simulation.busy} />
      <Failure error={simulation.error} />
    </form>
  );
};

/** Closed: one line in the heading voice. Opened: the URL and what it configures. */
const Simulate = (props: Props): ReactNode => (
  <Collapsible data-slot="simulator">
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="none"
        data-slot="simulator-toggle"
        className="group w-full justify-start gap-1.5 py-3 hover:bg-transparent"
      >
        <span className={HEADING}>Simulate a tag</span>
        <span className="text-sm font-normal text-muted-foreground">on {props.site}</span>
        <Chevron className="ml-auto group-aria-expanded:rotate-180" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SimulateForm {...props} />
    </CollapsibleContent>
  </Collapsible>
);

const PROBLEMS = new Set<SimulatedStatus>(["failed", "silent"]);

const StatusLine = ({ status }: { status: SimulatedStatus | null }): ReactNode =>
  status ? (
    <p
      data-slot="simulator-status"
      data-problem={PROBLEMS.has(status) || undefined}
      className={cn("mt-1 mb-0 text-md", PROBLEMS.has(status) ? "text-warning-text" : "text-foreground")}
    >
      {STATUS_LINES[status]}
    </p>
  ) : null;

/** Where the simulated tag loads, or that it is paused and loads nowhere. */
const whereLine = (kept: SiteSimulation): string =>
  kept.enabled
    ? `On every page of ${kept.site}, in this browser.`
    : `Paused. Nothing loads on ${kept.site} until you resume it.`;

type Kept = SiteSimulation & { install: NonNullable<SiteSimulation["install"]> };

/** Which tag, and the stamp that says whether it is loading or set aside. */
const SimulatedHead = ({ kept }: { kept: Kept }): ReactNode => (
  <div className="flex items-start gap-3">
    <div className="min-w-0 flex-auto">
      <h2 id="mj-simulated-title" className={HEADING}>
        Simulated tag
      </h2>
      <p className="mt-1 mb-0 font-mono text-sm leading-[1.45] wrap-anywhere text-foreground">{kept.install.appId}</p>
    </div>
    <span className="mt-1 flex-none">
      <Stamp label={kept.enabled ? "Simulated" : "Paused"} tone={kept.enabled ? "identity" : "soft"} />
    </span>
  </div>
);

/** The two ways out: set it aside for now, or take it off the site. Neither acts twice while one is working. */
const SimulatedActions = ({ kept, simulation }: { kept: Kept; simulation: SimulationState }): ReactNode => {
  const idle = (act: () => void) => (simulation.busy ? undefined : act);
  return (
    <div className="mt-3 flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="xs"
        aria-disabled={simulation.busy}
        onClick={idle(() => simulation.pause(!kept.enabled))}
      >
        {kept.enabled ? "Pause" : "Resume"}
      </Button>
      <Button
        type="button"
        variant="link"
        size="none"
        className="text-sm"
        onClick={idle(() => void simulation.remove())}
      >
        Remove
      </Button>
    </div>
  );
};

/** The URL the tag loads from, one disclosure down: ninety characters of machine text is not the headline. */
const ScriptUrl = ({ url }: { url: string }): ReactNode => (
  <Collapsible className="mt-2">
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="none"
        className="group -ml-1 gap-[3px] py-[3px] pl-1 font-display text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:text-foreground"
      >
        Script URL
        <Chevron className="group-aria-expanded:rotate-180" />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <Machine className="mt-1">{url}</Machine>
    </CollapsibleContent>
  </Collapsible>
);

/** A simulated tag, on record: stamped, named, where it loads, what became of it, and the two ways out. */
const Simulating = ({ kept, simulation }: { kept: Kept; simulation: SimulationState }): ReactNode => (
  <section
    data-slot="simulating"
    data-paused={kept.enabled ? undefined : true}
    aria-labelledby="mj-simulated-title"
    className="pt-4 pb-4"
  >
    <SimulatedHead kept={kept} />
    <p className="mt-2 mb-0 text-md text-muted-foreground">{whereLine(kept)}</p>
    <StatusLine status={simulation.status} />
    <ScriptUrl url={kept.install.url} />
    <SimulatedActions kept={kept} simulation={simulation} />
    <Failure error={simulation.error} />
  </section>
);

export const SimulatorSection = (props: Props): ReactNode => {
  const kept = props.simulation.simulation;
  return (
    <div data-slot="simulator-section" className="border-b border-border px-5">
      {kept?.install ? (
        <Simulating kept={{ ...kept, install: kept.install }} simulation={props.simulation} />
      ) : (
        <Simulate {...props} />
      )}
    </div>
  );
};
