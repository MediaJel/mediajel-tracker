import { ReactNode } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";

import { Chevron } from "~/ui/components/Chevron";
import { Definitions } from "~/ui/components/Definitions";
import { Eyebrow, Fine, Machine } from "~/ui/components/Section";
import { Button } from "~/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { ConfigEntry, ConfigGroup, ConfigurationView, configurationOf } from "~/ui/tag-config";

/**
 * The configuration slip: everything a tag runs with, one disclosure under its app ID.
 *
 * Closed by default, because the reading above it is what an engineer came for; opened, it is
 * the tag's whole setup in words — identity, the audience segments with their partners named,
 * the plugins, the controls, whatever else the URL carried — a source line saying where the facts
 * came from, and the script's own markup last, as machine text. Values are set in mono and wrap
 * anywhere, because a Nexxen segment is ninety opaque characters and cutting it would hide the one
 * thing worth comparing.
 */

/** A value the page runs because an edit is being tried: in the live ink, and said. */
const Tried = ({ tried }: { tried: boolean }): ReactNode =>
  tried ? <span className="ml-1.5 font-sans text-primary">tried</span> : null;

/** A value, and under it — in the body face, soft — where it was read from and what it means. */
const EntryValue = ({ entry, tried = false }: { entry: ConfigEntry; tried?: boolean }): ReactNode => (
  <>
    <span className={tried ? "text-primary" : undefined}>{entry.value}</span>
    <Tried tried={tried} />
    {entry.legacy && (
      <span className="block font-sans text-muted-foreground">
        read from <span className="font-mono">{entry.legacy}</span>, its legacy name
      </span>
    )}
    {entry.note && <span className="block font-sans text-muted-foreground">{entry.note}</span>}
  </>
);

/** A group's entries as a two-column list; every group shares one label column, so the values line up down the slip. */
const Group = ({ group, tried }: { group: ConfigGroup; tried: ReadonlySet<string> }): ReactNode => (
  <div className="mt-2.5">
    <Eyebrow className="mb-1 block">{group.title}</Eyebrow>
    <Definitions
      className="mb-0 grid-cols-[9.5rem_1fr] gap-y-1 text-xs [&_dd]:text-left [&_dd]:font-mono [&_dd]:wrap-anywhere"
      entries={group.entries.map((entry) => [
        entry.label,
        <EntryValue key={entry.label} entry={entry} tried={tried.has(entry.key)} />,
      ])}
    />
  </div>
);

const NONE_TRIED: ReadonlySet<string> = new Set();

/** The slip's content: the source line, every group, and the script's markup — printed by the slip and by a record event's receipt. */
export const ConfigurationGroups = ({
  view,
  tried = NONE_TRIED,
}: {
  view: ConfigurationView;
  /** The params an edit being tried on the page sets. */
  tried?: ReadonlySet<string>;
}): ReactNode => (
  <>
    <Fine className="mt-1">{view.source}</Fine>
    {view.groups.map((group) => (
      <Group key={group.title} group={group} tried={tried} />
    ))}
    {view.markup && (
      <div className="mt-2.5">
        <Eyebrow className="mb-1 block">Script</Eyebrow>
        <Machine>{view.markup}</Machine>
      </div>
    )}
  </>
);

interface SlipProps {
  tag: TagRecord;
  /** Said beside the disclosure, closed or open — that an edit is being tried. */
  note?: ReactNode;
  /** Under the groups: what can be done with the configuration. */
  footer?: ReactNode;
  /** In the groups' place while the configuration is being edited. */
  editing?: ReactNode;
  tried?: ReadonlySet<string>;
}

export const ConfigurationSlip = ({ tag, note, footer, editing, tried }: SlipProps): ReactNode => {
  const view = configurationOf(tag);
  if (!view) return null;
  return (
    <Collapsible className="mb-2.5 data-open:mb-5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="none"
            data-slot="tag-config-toggle"
            className="group -ml-1 gap-[3px] py-[3px] pl-1 font-display text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:text-foreground"
          >
            Tag configuration
            <Chevron className="group-aria-expanded:rotate-180" />
          </Button>
        </CollapsibleTrigger>
        {note}
      </div>
      <CollapsibleContent data-slot="tag-config">
        {editing ?? <ConfigurationGroups view={view} tried={tried} />}
        {footer}
      </CollapsibleContent>
    </Collapsible>
  );
};
