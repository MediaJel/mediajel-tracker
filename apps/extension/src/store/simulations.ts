import { Storage } from "@plasmohq/storage";

import { SiteSimulation } from "@mediajel/assistant-core/simulation";

import { SIMULATIONS_INDEX_KEY, simulationKey } from "~/store/keys";

/**
 * The tags simulated in this browser, one per site, kept in `chrome.storage.local` until removed —
 * across reloads and browser restarts, the way an engineer expects a tag they installed to stay
 * installed. Read through an in-memory mirror; every change goes through one write chain, so two
 * clicks in a row never write over each other.
 */

const area = new Storage({ area: "local" });

const mirror = new Map<string, SiteSimulation | null>();
let chain: Promise<unknown> = Promise.resolve();

const isSimulation = (value: Partial<SiteSimulation> | null | undefined, site: string): boolean =>
  value?.v === 1 && value.site === site;

/** A stored simulation as this build reads it, with what an older build never wrote filled in. */
const completed = (value: Partial<SiteSimulation>, site: string): SiteSimulation => ({
  v: 1,
  site,
  enabled: value.enabled !== false,
  install: value.install ?? null,
  tried: value.tried ?? {},
  updatedAt: value.updatedAt ?? 0,
});

/** A stored value as this build reads it: anything that is not a simulation is none. */
const normalized = (value: Partial<SiteSimulation> | null | undefined, site: string): SiteSimulation | null =>
  isSimulation(value, site) ? completed(value as Partial<SiteSimulation>, site) : null;

export const readSimulation = async (site: string): Promise<SiteSimulation | null> => {
  if (!mirror.has(site)) mirror.set(site, normalized(await area.get<SiteSimulation>(simulationKey(site)), site));
  return mirror.get(site) ?? null;
};

const writeIndex = async (site: string, present: boolean): Promise<void> => {
  const index = (await area.get<string[]>(SIMULATIONS_INDEX_KEY)) ?? [];
  const rest = index.filter((entry) => entry !== site);
  await area.set(SIMULATIONS_INDEX_KEY, present ? [site, ...rest] : rest);
};

const persist = async (site: string, next: SiteSimulation | null): Promise<void> => {
  mirror.set(site, next);
  if (next) await area.set(simulationKey(site), next);
  else await area.remove(simulationKey(site));
  await writeIndex(site, next !== null);
};

/** Changes a site's simulation — `null` removes it — and answers with what is kept now. */
export const changeSimulation = (
  site: string,
  change: (current: SiteSimulation | null) => SiteSimulation | null,
): Promise<SiteSimulation | null> => {
  const next = chain.then(async () => {
    const updated = change(await readSimulation(site));
    await persist(site, updated);
    return updated;
  });
  chain = next.catch(() => undefined);
  return next;
};

/** Every simulated tag in this browser, the most recently changed first. */
export const listSimulations = async (): Promise<SiteSimulation[]> => {
  const index = (await area.get<string[]>(SIMULATIONS_INDEX_KEY)) ?? [];
  const found = await Promise.all(index.map(readSimulation));
  return found.filter((simulation): simulation is SiteSimulation => simulation !== null);
};
