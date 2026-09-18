import { ReactNode } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";

import { Chevron } from "~/ui/components/Chevron";
import { Definitions } from "~/ui/components/Definitions";
import { Eyebrow, Fine, Machine } from "~/ui/components/Section";
import { Button } from "~/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { ConfigGroup, configurationOf } from "~/ui/tag-config";

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

/** A group's entries as a two-column list; a note follows its value in soft ink. */
const Group = ({ group }: { group: ConfigGroup }): ReactNode => (
  <div className="mt-2.5">
    <Eyebrow className="mb-1 block">{group.title}</Eyebrow>
    <Definitions
      className="mb-0 grid-cols-[auto_1fr] gap-y-1 text-xs [&_dd]:text-left [&_dd]:font-mono [&_dd]:wrap-anywhere"
      entries={group.entries.map((entry) => [
        entry.label,
        <>
          {entry.value}
          {entry.note && <span className="ml-1.5 font-sans text-muted-foreground">{entry.note}</span>}
        </>,
      ])}
    />
  </div>
);

export const ConfigurationSlip = ({ tag }: { tag: TagRecord }): ReactNode => {
  const view = configurationOf(tag);
  if (!view) return null;
  return (
    <Collapsible className="mb-2.5">
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
      <CollapsibleContent data-slot="tag-config">
        <Fine className="mt-1">{view.source}</Fine>
        {view.groups.map((group) => (
          <Group key={group.title} group={group} />
        ))}
        {view.markup && (
          <div className="mt-2.5">
            <Eyebrow className="mb-1 block">Script</Eyebrow>
            <Machine>{view.markup}</Machine>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
