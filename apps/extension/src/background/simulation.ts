import {
  SimulationOnPage,
  SimulationView,
  SiteSimulation,
  TriedEdit,
  commandOf,
  parseTagUrl,
} from "@mediajel/assistant-core/simulation";

import type { Handler } from "~/background/handle";
import { siteOfTab } from "~/background/tab-site";
import type { SimulationRequest } from "~/bridge/api";
import { BridgeDown } from "~/bridge/protocol";
import { siteOf } from "~/lib/site";
import { TAG_SEARCH } from "~/lib/tags";
import { deployOverrides, previewOverrides } from "~/service/client";
import type { DeployOutcome } from "~/service/client";
import { currentIdToken } from "~/store/auth";
import { writeSettings } from "~/store/settings";
import { changeSimulation, listSimulations, readSimulation } from "~/store/simulations";

/**
 * A simulated tag and tried edits, from the worker's side: kept per site, armed again on every new
 * page of that site, and said on the toolbar.
 *
 * The page bridge posts `ready` as each document starts; the worker answers with the tag to load,
 * the same way a recording is picked back up after the cart navigates to the thank-you page.
 * Every change reloads the tab it was made from, because a tag only ever starts at the top of a
 * page — which is also why nothing here asks the operator to reload anything.
 */

/** What each tab's page said about its simulation on its latest load. */
const pages = new Map<number, SimulationOnPage>();

/** The live ink, so the toolbar's SIM reads as the panel's own. */
const IDENTITY = "#1f4fe0";

/** The toolbar says SIM on every tab of a simulated site, so a forgotten simulation is never invisible. */
export const markTab = async (tabId: number, url: string): Promise<void> => {
  const site = siteOf(url);
  const on = site ? commandOf(await readSimulation(site)) !== null : false;
  try {
    await chrome.action?.setBadgeText({ tabId, text: on ? "SIM" : "" });
    if (on) await chrome.action?.setBadgeBackgroundColor({ tabId, color: IDENTITY });
  } catch {
    // The tab closed while this ran.
  }
};

const markSite = async (site: string): Promise<void> => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined && siteOf(tab.url ?? "") === site)
      .map((tab) => markTab(tab.id as number, tab.url ?? "")),
  );
};

type Send = (tabId: number, message: BridgeDown) => Promise<boolean>;

/** A new document in a tab: what the last one said is gone, and the site's simulation is armed again. */
export const armTab = async (tabId: number, site: string, send: Send): Promise<void> => {
  pages.delete(tabId);
  const command = commandOf(await readSimulation(site));
  if (command) await send(tabId, { type: "simulate", ...command });
};

const QUIET: SimulationOnPage = { installFailed: false, late: [] };

/** What the page said, added to what it said before on this document. */
export const reportFromPage = (tabId: number, report: Partial<SimulationOnPage>): void => {
  pages.set(tabId, { ...(pages.get(tabId) ?? QUIET), ...report });
};

export const forgetPage = (tabId: number): void => {
  pages.delete(tabId);
};

export const simulationView = async (tabId: number, site: string): Promise<SimulationView> => ({
  simulation: await readSimulation(site),
  page: pages.get(tabId) ?? null,
});

const reload = (tabId: number): void => {
  chrome.tabs.reload(tabId).catch(() => undefined);
};

/** After any change: the toolbar on every tab of the site, the tab it came from reloaded, and the view. */
const applied = async (tabId: number, site: string): Promise<SimulationView> => {
  await markSite(site);
  reload(tabId);
  return simulationView(tabId, site);
};

const blank = (site: string): SiteSimulation => ({
  v: 1,
  site,
  enabled: true,
  install: null,
  tried: {},
  updatedAt: Date.now(),
});

const installed = (current: SiteSimulation | null, site: string, url: string, appId: string): SiteSimulation => ({
  ...(current ?? blank(site)),
  enabled: true,
  install: { url, appId },
  updatedAt: Date.now(),
});

/** A simulation that holds nothing to run is no simulation. */
const orNone = (simulation: SiteSimulation): SiteSimulation | null =>
  simulation.install || Object.keys(simulation.tried).length > 0 ? simulation : null;

/** The simulation with one tag's edit tried — or, with none, no longer tried. */
const withTried = (current: SiteSimulation | null, site: string, appId: string, edit: TriedEdit | null) => {
  const tried = { ...(current?.tried ?? {}) };
  if (edit) tried[appId] = edit;
  else delete tried[appId];
  return orNone({ ...(current ?? blank(site)), enabled: true, tried, updatedAt: Date.now() });
};

/**
 * The block the service renders for an edit — byte for byte what a deploy writes. No edits, when the
 * tag's app-id file holds an earlier one, is still an edit: its version, named on the page, makes the
 * deployed block stand aside, so the page runs the file as a deploy of no edits would leave it.
 */
const renderedEdit = async (appId: string, edits: Record<string, string>): Promise<TriedEdit | null> => {
  const preview = await previewOverrides(currentIdToken, { appId, edits });
  if (Object.keys(edits).length === 0 && !preview.deployed) return null;
  return { edits, block: preview.block ?? "", version: preview.version };
};

/** The tried edit, marked as committed: the page runs it until the tag's CDN serves it. */
const markDeployed = (current: SiteSimulation | null, appId: string, outcome: DeployOutcome) => {
  const tried = current?.tried[appId];
  if (!current || !tried) return current;
  const deployed = { commitUrl: outcome.commitUrl, fileUrl: outcome.fileUrl, at: Date.now() };
  return { ...current, tried: { ...current.tried, [appId]: { ...tried, deployed } } };
};

/** Committed edits the CDN now serves are no longer tried: the page runs them without the assistant. */
const withoutLive = (current: SiteSimulation | null, live: string[]): SiteSimulation | null => {
  if (!current) return current;
  const tried = Object.fromEntries(
    Object.entries(current.tried).filter(([appId, edit]) => !(edit.deployed && live.includes(appId))),
  );
  return orNone({ ...current, tried });
};

/** A page found the CDN serving a tag's committed edit: the site stops trying it. */
export const settleLive = async (site: string, live: string[]): Promise<void> => {
  await changeSimulation(site, (current) => withoutLive(current, live));
  await markSite(site);
};

const install: Handler<"simulation/install"> = async (request) => {
  const site = await siteOfTab(request.tabId);
  const parsed = parseTagUrl(request.url, TAG_SEARCH);
  if (!parsed.ok) throw new Error(parsed.reason || "Paste the tag's whole URL, starting with https://.");
  await changeSimulation(site, (current) => installed(current, site, parsed.url, parsed.appId));
  await writeSettings({ lastInjectedTagUrl: parsed.url });
  return applied(request.tabId, site);
};

const tryEdit: Handler<"simulation/try"> = async (request) => {
  const site = await siteOfTab(request.tabId);
  const edit = await renderedEdit(request.appId, request.edits);
  await changeSimulation(site, (current) => withTried(current, site, request.appId, edit));
  return applied(request.tabId, site);
};

const stop: Handler<"simulation/stop"> = async (request) => {
  const site = await siteOfTab(request.tabId);
  await changeSimulation(site, (current) => withTried(current, site, request.appId, null));
  return applied(request.tabId, site);
};

const deploy: Handler<"simulation/deploy"> = async (request) => {
  const site = await siteOfTab(request.tabId);
  const tried = (await readSimulation(site))?.tried[request.appId];
  if (!tried) throw new Error("There is no edit tried for this tag, so there is nothing to deploy.");
  const outcome = await deployOverrides(currentIdToken, {
    appId: request.appId,
    edits: tried.edits,
    expectedSha: request.expectedSha,
  });
  await changeSimulation(site, (current) => markDeployed(current, request.appId, outcome));
  return { view: await simulationView(request.tabId, site), outcome };
};

const pause: Handler<"simulation/pause"> = async (request) => {
  const site = await siteOfTab(request.tabId);
  await changeSimulation(site, (current) => current && { ...current, enabled: request.enabled, updatedAt: Date.now() });
  return applied(request.tabId, site);
};

/** The tab the removal came from is reloaded when it shows the site, so the page is its own again. */
const reloadIfOn = async (tabId: number | undefined, site: string): Promise<void> => {
  if (tabId === undefined) return;
  const tab = await chrome.tabs.get(tabId);
  if (siteOf(tab.url ?? "") === site) reload(tabId);
};

const remove: Handler<"simulation/remove"> = async (request) => {
  await changeSimulation(request.site, () => null);
  await markSite(request.site);
  await reloadIfOn(request.tabId, request.site);
  return listSimulations();
};

export const SIMULATION_REQUESTS: { [K in SimulationRequest["type"]]: Handler<K> } = {
  "simulation/read": async (request) => simulationView(request.tabId, await siteOfTab(request.tabId)),
  "simulation/install": install,
  "simulation/pause": pause,
  "simulation/try": tryEdit,
  "simulation/stop": stop,
  "simulation/deploy": deploy,
  "simulation/reload": (request) => {
    reload(request.tabId);
    return null;
  },
  "simulation/remove": remove,
  "simulation/list": () => listSimulations(),
};
