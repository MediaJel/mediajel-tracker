import { tagParams } from "@mediajel/assistant-core/context";
import { SimulatedInstall, SimulationOnPage } from "@mediajel/assistant-core/simulation";
import { TagRecord } from "@mediajel/assistant-core/tags";

import { ConfigGroup, ConfigurationView, configurationOf } from "~/ui/tag-config";

/**
 * What the simulator says, decided without a panel: a pasted URL's configuration in the slip's own
 * groups, and — once the tag is simulated — what became of it on the page, in words.
 */

/** A URL the simulator can load, read the way the tag reads it. */
export interface TagUrl {
  url: string;
  appId: string;
  params: Record<string, string>;
}

/** The collector is the tag build's own, never the URL's, so the URL has nothing to say about it. */
const withoutCollector = (groups: ConfigGroup[]): ConfigGroup[] =>
  groups.map((group) => ({ ...group, entries: group.entries.filter((entry) => entry.label !== "Collector") }));

const tagOf = ({ url, appId, params }: TagUrl): TagRecord => ({
  appId,
  state: "installed",
  environment: params.environment ?? "",
  version: params.version || "1",
  event: params.event ?? "",
  announced: false,
  firstSeenAt: 0,
  collector: "",
  enabled: params.enable !== "false",
  config: { params: tagParams(url), src: url, element: "", source: "script" },
});

/** A pasted URL's configuration, in the groups the configuration slip prints. */
export const urlConfiguration = (tag: TagUrl): ConfigurationView => {
  const view = configurationOf(tagOf(tag)) as ConfigurationView;
  return {
    source: "Read from the URL: what the tag runs with before any overrides.",
    groups: withoutCollector(view.groups),
    markup: "",
  };
};

export type SimulatedStatus = "loading" | "running" | "beside" | "silent" | "opted-out" | "failed";

interface Facts {
  failed: boolean;
  own: TagRecord["state"] | undefined;
  others: boolean;
  settled: boolean;
}

const LIVE = new Set<TagRecord["state"]>(["running", "sending"]);

const factsOf = (
  install: SimulatedInstall,
  page: SimulationOnPage | null,
  tags: TagRecord[],
  settled: boolean,
): Facts => ({
  failed: page?.installFailed === true,
  own: tags.find((tag) => tag.appId === install.appId)?.state,
  others: tags.some((tag) => tag.appId !== install.appId && LIVE.has(tag.state)),
  settled,
});

/** In the order they are true: the first that holds is what the slip says. */
const CHECKS: [SimulatedStatus, (facts: Facts) => boolean][] = [
  ["failed", (facts) => facts.failed],
  ["opted-out", (facts) => facts.own === "opted-out"],
  ["beside", (facts) => LIVE.has(facts.own as TagRecord["state"]) && facts.others],
  ["running", (facts) => LIVE.has(facts.own as TagRecord["state"])],
  ["silent", (facts) => facts.settled && facts.others],
];

/** What became of a simulated tag on this page, from what the page's tags have said. */
export const simulatedStatus = (
  install: SimulatedInstall,
  page: SimulationOnPage | null,
  tags: TagRecord[],
  settled: boolean,
): SimulatedStatus => {
  const facts = factsOf(install, page, tags, settled);
  return CHECKS.find(([, holds]) => holds(facts))?.[0] ?? "loading";
};

export const STATUS_LINES: Record<SimulatedStatus, string> = {
  loading: "Loading on this page.",
  running: "Running on this page.",
  beside: "Running beside the page’s own tag, so both send page views.",
  silent: "The page’s own tag started first, so this copy is silent. To change that tag, edit its configuration below.",
  "opted-out": "This browser sends Do Not Track or Global Privacy Control, so the tag opted out.",
  failed: "The page refused the tag’s script: its security policy or the tag’s host blocked it.",
};
