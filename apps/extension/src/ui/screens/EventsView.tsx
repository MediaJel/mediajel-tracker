import { Fragment, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";
import { attributePartner } from "@mediajel/assistant-core/wire/partners";
import {
  CollectorEvent,
  CustomTagFetch,
  Entity,
  FieldGroup,
  ForeignEvent,
  PartnerSignal,
  ThirdPartyFire,
  ThirdPartyRegistration,
  WireEvent,
} from "@mediajel/assistant-core/wire/types";
import { attributed, byPage } from "@mediajel/assistant-core/wire/view";

import { cn } from "~/lib/utils";
import type { WireEventsState } from "~/sidepanel/useWireEvents";
import { Definitions } from "~/ui/components/Definitions";
import { Stack } from "~/ui/components/Panel";
import { Empty, Fine, Machine } from "~/ui/components/Section";
import { Chevron } from "~/ui/components/Chevron";
import { Badge } from "~/ui/components/ui/badge";
import { Button } from "~/ui/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/ui/components/ui/collapsible";
import { Input } from "~/ui/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "~/ui/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "~/ui/components/ui/toggle-group";
import { Beacon, Collector, KindIcon } from "~/ui/icons";
import { shortAppId } from "~/ui/activity";
import {
  Family,
  Row,
  TRIGGERS,
  clock,
  matches,
  padCount,
  pageLabel,
  partnerName,
  recordAsTag,
  rowOf,
  schemaShort,
  typeOf,
} from "~/ui/ledger";
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

const collectorFacts = (event: CollectorEvent): [string, string][] => [
  ["Collector", event.collector],
  ["Time", clock(event.at)],
  ["App", event.appId || "not named"],
];

/** Where a partner signal was attributed from, in one sentence. */
const attributionLine = (event: PartnerSignal, tags: TagRecord[]): string => {
  const attribution = attributePartner(event, tags);
  if (attribution.how === "matched")
    return `Matches this page’s tag ${shortAppId(attribution.appId)} by its ${attribution.param}.`;
  return attribution.how === "sole-tag"
    ? "Attributed to the page’s only tag."
    : "No tag on this page names this segment.";
};

const partnerNotes = (event: PartnerSignal): string[] => [
  ...(event.unconfigured ? ["The tag’s own default: no Dstillery segment was configured for this page."] : []),
  ...(event.companion ? ["The same pixel on the partner’s companion host."] : []),
];

const PartnerReceipt = ({ event, tags }: { event: PartnerSignal; tags: TagRecord[] }): ReactNode => (
  <>
    <Definitions
      className={FACTS}
      entries={[
        ["Partner", partnerName(event.partner, event.purpose)],
        ["Time", clock(event.at)],
        ["Segment", event.segment || "—"],
        ["URL", event.url],
      ]}
    />
    <Fine className="mt-2">{attributionLine(event, tags)}</Fine>
    {partnerNotes(event).map((note) => (
      <Fine key={note}>{note}</Fine>
    ))}
  </>
);

const CustomTagReceipt = ({ event }: { event: CustomTagFetch }): ReactNode => (
  <Definitions
    className={FACTS}
    entries={[
      ["Loads", event.scope === "domain" ? "the domain’s custom tag" : "the app ID’s custom tag"],
      ["Name", event.name],
      ["Time", clock(event.at)],
      ["URL", event.url],
    ]}
  />
);

const registrationFacts = (event: ThirdPartyRegistration): [string, string][] =>
  event.triggers.map((trigger) => [
    TRIGGERS[trigger.trigger],
    `${trigger.count} to ${trigger.hosts.join(", ") || "—"}`,
  ]);

const ThirdPartyReceipt = ({ event }: { event: ThirdPartyRegistration | ThirdPartyFire }): ReactNode =>
  event.phase === "fired" ? (
    <Definitions
      className={FACTS}
      entries={[
        ["Trigger", TRIGGERS[event.trigger]],
        ["As", event.element],
        ["Host", event.host],
        ["Time", clock(event.at)],
        ["URL", event.url],
      ]}
    />
  ) : (
    <Definitions className={FACTS} entries={[["Time", clock(event.at)], ...registrationFacts(event)]} />
  );

const ForeignReceipt = ({ event }: { event: ForeignEvent }): ReactNode => (
  <>
    <Definitions
      className={FACTS}
      entries={[
        ["Collector", event.collector],
        ["Tracker", event.tracker],
        ["Version", event.version],
        ["Event", event.code],
        ["Time", clock(event.at)],
      ]}
    />
    <Fine className="mt-2">Another vendor’s tracker: that it sent is kept, not what it sent.</Fine>
  </>
);

const FACTS =
  "mt-2 mb-0 grid-cols-[auto_1fr] gap-y-1 text-sm [&_dd]:text-left [&_dd]:font-mono [&_dd]:text-xs [&_dd]:wrap-anywhere";

const METHODS: Record<Exclude<WireEvent["source"], "collector" | "third-party">, string> = {
  partner: "get",
  "custom-tag": "fetch",
  foreign: "get",
};

/** The transport as the chip prints it. */
const method = (event: WireEvent): string => {
  if (event.source === "collector") return event.transport;
  if (event.source === "third-party") return event.phase === "fired" ? event.element : "page";
  return METHODS[event.source];
};

const CollectorBody = ({ event }: { event: CollectorEvent }): ReactNode => (
  <>
    <Definitions className={FACTS} entries={collectorFacts(event)} />
    <CollectorReceipt event={event} />
  </>
);

type BodyOf<K extends WireEvent["source"]> = (event: Extract<WireEvent, { source: K }>, tags: TagRecord[]) => ReactNode;

/** What a receipt holds under its transport — the facts and the payload — by source. */
const BODIES: { [K in WireEvent["source"]]: BodyOf<K> } = {
  collector: (event) => <CollectorBody event={event} />,
  partner: (event, tags) => <PartnerReceipt event={event} tags={tags} />,
  "custom-tag": (event) => <CustomTagReceipt event={event} />,
  "third-party": (event) => <ThirdPartyReceipt event={event} />,
  foreign: (event) => <ForeignReceipt event={event} />,
};

const Body = ({ event, tags }: { event: WireEvent; tags: TagRecord[] }): ReactNode =>
  (BODIES[event.source] as (event: WireEvent, tags: TagRecord[]) => ReactNode)(event, tags);

/** The receipt a row opens into: the transport as a chip and the status word, then its facts and payload. */
const Receipt = ({ event, row, tags }: { event: WireEvent; row: Row; tags: TagRecord[] }): ReactNode => (
  <div data-slot="ledger-detail" className="px-5 pt-1 pb-4">
    <div className="flex items-center gap-2">
      <Badge variant="chip">{method(event)}</Badge>
      {row.status && (
        <span className={cn("text-xs", row.problem ? "text-warning-text" : "text-muted-foreground")}>{row.status}</span>
      )}
    </div>
    <Body event={event} tags={tags} />
  </div>
);

interface RowProps {
  event: WireEvent;
  row: Row;
  tags: TagRecord[];
  open: boolean;
  onToggle(id: string | null): void;
}

/** One event's row: the trigger is the row, its content the receipt; Escape closes it and comes back to the row. */
const LedgerRow = ({ event, row, tags, open, onToggle }: RowProps): ReactNode => {
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
          <Receipt event={event} row={row} tags={tags} />
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
  events: WireEvent[];
  family: Filter;
  site: string;
  tags: TagRecord[];
  rows: Map<string, Row>;
  kept: Set<string>;
  openId: string | null;
  onToggle(id: string | null): void;
}

/** The pages and their rows, newest first, the newest two hundred of them until the rest are asked for. */
const Ledger = ({ events, family, site, tags, rows, kept, openId, onToggle }: LedgerProps): ReactNode => {
  const [all, setAll] = useState(false);
  const pages = byPage({ site, events: events.filter((event) => kept.has(event.id)), pages: [], dropped: 0, seq: 0 });
  let drawn = 0;
  return (
    <>
      <ol
        data-slot="ledger"
        data-family={family}
        aria-label="Events on this tab, newest first"
        className="m-0 list-none p-0 tear-bottom"
      >
        {pages.map(({ page, events }) => (
          <Fragment key={page.key}>
            <PageBand count={events.length} url={page.url} site={site} />
            {events.map((event) =>
              all || drawn++ < PAGE ? (
                <LedgerRow
                  key={event.id}
                  event={event}
                  row={rows.get(event.id)!}
                  tags={tags}
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

/** Other vendors' trackers, apart and closed: an engineer can tell ours from theirs without confusing the two. */
const OtherTrackers = ({
  events,
  rows,
  tags,
  openId,
  onToggle,
}: Pick<LedgerProps, "events" | "rows" | "tags" | "openId" | "onToggle">): ReactNode =>
  events.length > 0 ? (
    <Collapsible className="mt-3 px-5">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="none"
          className="group gap-[3px] py-[3px] font-display text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:text-foreground"
        >
          Other trackers on this page ({events.length})
          <Chevron className="group-aria-expanded:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol
          data-slot="ledger-foreign"
          aria-label="Other trackers on this page"
          className="m-0 -mx-5 mt-2 list-none p-0"
        >
          {events.map((event) => (
            <LedgerRow
              key={event.id}
              event={event}
              row={rows.get(event.id)!}
              tags={tags}
              open={openId === event.id}
              onToggle={onToggle}
            />
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  ) : null;

/** The rows the list draws: with every family, other vendors' trackers keep to their own group at the foot. */
const listed = (events: WireEvent[], family: Filter): WireEvent[] =>
  family === "all" ? events.filter((event) => event.source !== "foreign") : events;

export const EventsView = ({
  ledger,
  site,
  tags,
}: {
  ledger: WireEventsState;
  site: string;
  /** The page's tags, for attributing partner signals to the tag whose segment they carry. */
  tags: TagRecord[];
}): ReactNode => {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { openLedger, closeLedger } = ledger;
  useEffect(() => {
    openLedger();
    return closeLedger;
  }, [openLedger, closeLedger]);
  const events = attributed(ledger.events, tags);
  const rows = new Map(events.map((event) => [event.id, rowOf(event)]));
  const own = listed(events, family);
  const kept = new Set(own.filter((event) => keep(rows.get(event.id)!, family, query)).map((event) => event.id));
  const foreign = family === "all" ? events.filter((event) => event.source === "foreign") : [];
  return (
    <Stack>
      <section data-slot="events" aria-labelledby="mj-events-title" className="pb-5">
        <Head ledger={ledger} />
        <LedgerFilter query={query} family={family} onQuery={setQuery} onFamily={setFamily} />
        {kept.size > 0 ? (
          <Ledger
            events={own}
            family={family}
            site={site}
            tags={tags}
            rows={rows}
            kept={kept}
            openId={openId}
            onToggle={setOpenId}
          />
        ) : (
          <div className="px-5">
            <Nothing ledger={ledger} query={query} family={family} />
          </div>
        )}
        <OtherTrackers events={foreign} rows={rows} tags={tags} openId={openId} onToggle={setOpenId} />
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
