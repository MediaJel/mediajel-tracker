import { Fragment, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";

import { CollectorEvent, Entity, FieldGroup, WireEvent } from "@mediajel/assistant-core/wire/types";
import { byPage } from "@mediajel/assistant-core/wire/view";

import { cn } from "~/lib/utils";
import type { WireEventsState } from "~/sidepanel/useWireEvents";
import { Definitions } from "~/ui/components/Definitions";
import { Stack } from "~/ui/components/Panel";
import { Empty, Fine, Machine } from "~/ui/components/Section";
import { Badge } from "~/ui/components/ui/badge";
import { Button } from "~/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { Input } from "~/ui/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "~/ui/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "~/ui/components/ui/toggle-group";
import { Beacon, Collector, KindIcon } from "~/ui/icons";
import { Family, Row, clock, matches, padCount, pageLabel, recordAsTag, rowOf, schemaShort, typeOf } from "~/ui/ledger";
import { ConfigurationGroups } from "~/ui/screens/ConfigurationSlip";
import { configurationOf } from "~/ui/tag-config";

/**
 * Events: the ledger — every event this tab's page was heard sending, newest first under the
 * page that made it, each row opening in place into its receipt.
 *
 * A ledger, not a console: one row per event with a family mark, a plain name, the time in mono,
 * who it belongs to, and a status word only when something went wrong. The receipt is the
 * payload in groups behind hairlines, entities named by schema and version, every value with a
 * monochrome type chip; the tag's own record event opens into its configuration, the way the slip
 * prints it. All of it is read from this tab's own traffic; none of it leaves the browser, and
 * the line under the filter says so in soft ink — privacy purple marks bytes that leave, which is
 * the opposite of this.
 */

type Filter = "all" | Family;

const FAMILIES: { id: Filter; label: string; empty: string; title: string }[] = [
  { id: "all", label: "All", empty: "events", title: "Everything this tab sent" },
  { id: "collector", label: "Collector", empty: "collector events", title: "Events sent to MediaJel’s collector" },
  { id: "partner", label: "Partners", empty: "partner beacons", title: "Beacons fired to audience partners" },
  { id: "custom", label: "Custom", empty: "custom tags", title: "Custom tags, and the third-party tags they register" },
  { id: "foreign", label: "Other", empty: "other trackers’ events", title: "Other vendors’ trackers on this page" },
];

/** How many rows the list draws before offering the rest. */
const PAGE = 200;

const MARKS: Record<Family, ReactNode> = {
  collector: <Collector />,
  partner: <Beacon />,
  custom: <KindIcon kind="platform" />,
  foreign: <KindIcon kind="network" />,
};

/** A group of a receipt worth opening at once; the rest wait behind their hairline. */
const OPEN_GROUPS = new Set(["event", "structured", "transaction", "item"]);

/** A value in a receipt: its text, and the chip naming its type. */
const Value = ({ value }: { value: unknown }): ReactNode => (
  <span className="flex items-baseline justify-between gap-2">
    <span className="min-w-0 wrap-anywhere">{typeof value === "string" ? value : JSON.stringify(value)}</span>
    <Badge variant="chip">{typeOf(value)}</Badge>
  </span>
);

/** A group's fields as a ruled table: the key in mono, the value beside its chip. */
const FieldsTable = ({ rows }: { rows: [string, unknown][] }): ReactNode => (
  <Table className="mt-1">
    <TableBody>
      {rows.map(([key, value]) => (
        <TableRow key={key}>
          <TableCell className="w-[1%] font-mono text-xs whitespace-nowrap text-muted-foreground">{key}</TableCell>
          <TableCell className="text-sm text-foreground">
            <Value value={value} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

/** A titled part of a receipt, behind a hairline, opened or closed as its group deserves. */
const Part = ({ title, open, children }: { title: string; open: boolean; children: ReactNode }): ReactNode => (
  <Collapsible defaultOpen={open} className="mt-2.5 border-t border-border pt-2">
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="none"
        className="-ml-1 py-[3px] pl-1 font-display text-sm font-semibold text-foreground hover:bg-transparent"
      >
        {title}
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent>{children}</CollapsibleContent>
  </Collapsible>
);

const parsed = (json: string): unknown => {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** An entity's data as a table of its fields when it has fields, else as JSON. */
const EntityData = ({ mode, data }: { mode: "data" | "json"; data: unknown }): ReactNode =>
  mode === "data" && isRecord(data) ? (
    <FieldsTable rows={Object.entries(data)} />
  ) : (
    <Machine className="mt-1">{JSON.stringify(data, null, 2)}</Machine>
  );

/** A self-describing block: the schema's name and version, the vendor in fine print, and its data as fields or JSON. */
const EntityBlock = ({ entity }: { entity: Entity }): ReactNode => {
  const [mode, setMode] = useState<"data" | "json">("data");
  const data = parsed(entity.data);
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-mono text-sm text-foreground">{schemaShort(entity.schema)}</span>
        {entity.vendor && <Fine className="mb-0">{entity.vendor}</Fine>}
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(next) => next && setMode(next as "data" | "json")}
          className="ml-auto"
          aria-label="Show the data as fields or as JSON"
        >
          <ToggleGroupItem value="data">Data</ToggleGroupItem>
          <ToggleGroupItem value="json">JSON</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <EntityData mode={mode} data={data} />
      {entity.truncated && <Fine className="mt-1">Cut to fit the browser’s memory; the page sent more.</Fine>}
    </div>
  );
};

const GroupPart = ({ group }: { group: FieldGroup }): ReactNode => (
  <Part title={group.label} open={OPEN_GROUPS.has(group.group)}>
    <FieldsTable rows={group.fields.map((field) => [field.label, field.value])} />
  </Part>
);

/** The tag's own record event opens into its configuration, the way the slip prints it. */
const RecordPart = ({ event }: { event: CollectorEvent }): ReactNode => {
  const view = event.record ? configurationOf(recordAsTag(event.record)) : null;
  return view ? (
    <Part title="Tag configuration" open>
      <ConfigurationGroups view={view} />
    </Part>
  ) : null;
};

/** Any other self-describing event: its inner schema and data. */
const PayloadPart = ({ event }: { event: CollectorEvent }): ReactNode =>
  event.schema && event.payload && !event.record ? (
    <Part title="Self-describing event" open>
      <EntityBlock
        entity={{ schema: event.schema, vendor: "", name: "", version: "", data: event.payload, truncated: false }}
      />
    </Part>
  ) : null;

/** What a collector event's receipt holds under its facts. */
const CollectorReceipt = ({ event }: { event: CollectorEvent }): ReactNode => (
  <>
    <RecordPart event={event} />
    <PayloadPart event={event} />
    {event.groups.map((group) => (
      <GroupPart key={group.group} group={group} />
    ))}
    {event.entities.length > 0 && (
      <Part title="Entities" open>
        {event.entities.map((entity) => (
          <EntityBlock key={entity.schema} entity={entity} />
        ))}
      </Part>
    )}
  </>
);

const facts = (event: CollectorEvent): [string, string][] => [
  ["Collector", event.collector],
  ["Time", clock(event.at)],
  ["App", event.appId || "not named"],
];

/** The receipt a row opens into: the transport chip and the status, three facts, then the payload. */
const Receipt = ({ event, row }: { event: CollectorEvent; row: Row }): ReactNode => (
  <div data-slot="ledger-detail" className="px-5 pt-1 pb-4">
    <div className="flex items-center gap-2">
      <Badge variant="chip">{event.transport}</Badge>
      {row.status && (
        <span className={cn("text-xs", row.problem ? "text-warning-text" : "text-muted-foreground")}>{row.status}</span>
      )}
    </div>
    <Definitions
      className="mt-2 mb-0 grid-cols-[auto_1fr] gap-y-1 text-sm [&_dd]:text-left [&_dd]:font-mono [&_dd]:text-xs [&_dd]:wrap-anywhere"
      entries={facts(event)}
    />
    <CollectorReceipt event={event} />
  </div>
);

interface RowProps {
  event: WireEvent;
  row: Row;
  open: boolean;
  onToggle(id: string | null): void;
}

/** One event's row: the trigger is the row, its content the receipt; Escape closes it and comes back to the row. */
const LedgerRow = ({ event, row, open, onToggle }: RowProps): ReactNode => {
  const trigger = useRef<HTMLButtonElement>(null);
  const onKeyDown = (keyboard: KeyboardEvent): void => {
    if (keyboard.key !== "Escape" || !open) return;
    onToggle(null);
    trigger.current?.focus();
  };
  return (
    <Collapsible asChild open={open} onOpenChange={(next) => onToggle(next ? row.id : null)}>
      <li data-slot="ledger-row" data-kind={row.family} className="bg-sheet shadow-press" onKeyDown={onKeyDown}>
        <CollapsibleTrigger asChild>
          <button
            ref={trigger}
            type="button"
            className="flex w-full cursor-pointer items-start gap-2.5 border-0 bg-transparent px-5 py-2.5 text-left"
          >
            <span className="mt-0.5 flex-none text-muted-foreground">{MARKS[row.family]}</span>
            <span className="min-w-0 flex-auto">
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-auto truncate text-base text-foreground">{row.name}</span>
                <span className="flex-none font-mono text-2xs text-muted-foreground">{row.clock}</span>
              </span>
              <span className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{row.who}</span>
                {row.facts && <span className="text-foreground tabular-nums">{row.facts}</span>}
                {row.status && <span className={cn(row.problem && "text-warning-text")}>{row.status}</span>}
              </span>
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Receipt event={event} row={row} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
};

/** The band a page's rows sit under: the count, two digits at least, and the page's label. */
const PageBand = ({ count, url, site }: { count: number; url: string; site: string }): ReactNode => {
  const label = pageLabel(url, site);
  return (
    <li data-slot="ledger-page" className="flex items-baseline gap-2.5 bg-carbon px-5 py-2">
      <Badge variant="pill" className="font-mono">
        {padCount(count)}
      </Badge>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-semibold text-foreground">{label.path}</span>
        {label.host && <span className="block text-xs text-muted-foreground">{label.host}</span>}
      </span>
    </li>
  );
};

/** Which rows a filter keeps: the family, then the words. */
const keep = (row: Row, family: Filter, query: string): boolean =>
  (family === "all" || row.family === family) && matches(row, query);

interface LedgerProps {
  ledger: WireEventsState;
  site: string;
  rows: Map<string, Row>;
  kept: Set<string>;
  openId: string | null;
  onToggle(id: string | null): void;
}

/** The pages and their rows, newest first, the newest two hundred of them until the rest are asked for. */
const Ledger = ({ ledger, site, rows, kept, openId, onToggle }: LedgerProps): ReactNode => {
  const [all, setAll] = useState(false);
  const pages = byPage({ ...ledger, events: ledger.events.filter((event) => kept.has(event.id)) });
  let drawn = 0;
  return (
    <>
      <ol data-slot="ledger" aria-label="Events on this tab, newest first" className="m-0 list-none p-0 tear-bottom">
        {pages.map(({ page, events }) => (
          <Fragment key={page.key}>
            <PageBand count={events.length} url={page.url} site={site} />
            {events.map((event) =>
              all || drawn++ < PAGE ? (
                <LedgerRow
                  key={event.id}
                  event={event}
                  row={rows.get(event.id)!}
                  open={openId === event.id}
                  onToggle={onToggle}
                />
              ) : null,
            )}
          </Fragment>
        ))}
      </ol>
      {!all && kept.size > PAGE && (
        <Button type="button" variant="link" size="none" className="mt-2 ml-5 text-md" onClick={() => setAll(true)}>
          Show older events
        </Button>
      )}
    </>
  );
};

const FAMILY_EMPTY = Object.fromEntries(FAMILIES.map((entry) => [entry.id, entry.empty])) as Record<Filter, string>;

/** What the view says when there is nothing to list — each a different fact. */
const Nothing = ({ ledger, query, family }: { ledger: WireEventsState; query: string; family: Filter }): ReactNode => {
  if (ledger.phase === "error") return <Empty data-slot="ledger-empty">{ledger.error}</Empty>;
  if (ledger.events.length === 0) {
    return (
      <Empty data-slot="ledger-empty">
        Listening. Events appear here as this page sends them — the page view first, then whatever the tag does next.
      </Empty>
    );
  }
  if (query.trim()) return <Empty data-slot="ledger-empty">Nothing matches “{query.trim()}”.</Empty>;
  return <Empty data-slot="ledger-empty">No {FAMILY_EMPTY[family]} on this tab yet.</Empty>;
};

/** One polite line for new rows, at most once every four seconds. */
const LiveNote = ({ count }: { count: number }): ReactNode => {
  const [said, setSaid] = useState(0);
  useEffect(() => {
    if (count === said) return;
    const timer = setTimeout(() => setSaid(count), 4000);
    return () => clearTimeout(timer);
  }, [count, said]);
  return (
    <p className="sr-only" aria-live="polite">
      {said > 0 ? `${said} new events` : ""}
    </p>
  );
};

const Head = ({ ledger }: { ledger: WireEventsState }): ReactNode => (
  <div className="flex items-baseline gap-3 px-5 pt-[18px] pb-2">
    <h2 id="mj-events-title" tabIndex={-1} className="m-0 font-display text-xl font-semibold text-foreground">
      Events
    </h2>
    <span className="text-sm text-muted-foreground">{ledger.events.length} on this tab</span>
    {ledger.events.length > 0 && (
      <Button type="button" variant="link" size="none" className="ml-auto text-md" onClick={ledger.clear}>
        Clear
      </Button>
    )}
  </div>
);

interface FilterProps {
  query: string;
  family: Filter;
  onQuery(query: string): void;
  onFamily(family: Filter): void;
}

const LedgerFilter = ({ query, family, onQuery, onFamily }: FilterProps): ReactNode => (
  <div data-slot="ledger-filter" className="grid gap-2 px-5 pb-2">
    <Input
      type="search"
      placeholder="Filter events"
      aria-label="Filter events"
      value={query}
      onChange={(event) => onQuery(event.target.value)}
    />
    <ToggleGroup
      type="single"
      value={family}
      onValueChange={(next) => next && onFamily(next as Filter)}
      aria-label="Which events to list"
    >
      {FAMILIES.map((entry) => (
        <ToggleGroupItem key={entry.id} value={entry.id} title={entry.title} className="whitespace-nowrap">
          {entry.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
    <Fine className="mb-0">Read from this tab’s own traffic, in this browser. Nothing here leaves it.</Fine>
  </div>
);

export const EventsView = ({ ledger, site }: { ledger: WireEventsState; site: string }): ReactNode => {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { openLedger, closeLedger } = ledger;
  useEffect(() => {
    openLedger();
    return closeLedger;
  }, [openLedger, closeLedger]);
  const rows = new Map(ledger.events.map((event) => [event.id, rowOf(event)]));
  const kept = new Set([...rows.values()].filter((row) => keep(row, family, query)).map((row) => row.id));
  return (
    <Stack>
      <section data-slot="events" aria-labelledby="mj-events-title" className="pb-5">
        <Head ledger={ledger} />
        <LedgerFilter query={query} family={family} onQuery={setQuery} onFamily={setFamily} />
        {kept.size > 0 ? (
          <Ledger ledger={ledger} site={site} rows={rows} kept={kept} openId={openId} onToggle={setOpenId} />
        ) : (
          <div className="px-5">
            <Nothing ledger={ledger} query={query} family={family} />
          </div>
        )}
        {ledger.dropped > 0 && (
          <Fine data-slot="ledger-dropped" className="mt-2 px-5">
            The oldest {ledger.dropped} events were let go to stay within the browser’s memory.
          </Fine>
        )}
        <LiveNote count={ledger.unseen} />
      </section>
    </Stack>
  );
};
