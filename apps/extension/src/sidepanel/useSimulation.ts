import { useCallback, useEffect, useState } from "react";

import { SimulationView, SiteSimulation } from "@mediajel/assistant-core/simulation";
import { TagRecord } from "@mediajel/assistant-core/tags";

import { Push, ask } from "~/bridge/api";
import { SimulatedStatus, simulatedStatus } from "~/ui/simulator";

/**
 * The site's simulated tag as the panel holds it: what the background keeps, what the page did
 * with it, and the three things the operator can do — simulate a tag, pause or resume it, remove
 * it. Read when a job comes on screen and on every reconnect; the page's reports arrive as pushes.
 */

export type SimulationPush = Extract<Push, { type: "simulation" }>;

export interface SimulationState extends SimulationView {
  /** What became of the simulated tag on this page; null when nothing is simulated or it is paused. */
  status: SimulatedStatus | null;
  busy: boolean;
  error: string;
  install(url: string): void;
  pause(enabled: boolean): void;
  /** Removes a site's simulation — this site's unless another is named — and answers with every one left. */
  remove(site?: string): Promise<SiteSimulation[]>;
}

interface Inputs {
  active: boolean;
  tabId: number | null;
  site: string;
  push: SimulationPush | null;
  /** Bumped on every reconnect and job load: the cue to read again. */
  generation: number;
  tags: TagRecord[];
  settled: boolean;
}

const NONE: SimulationView = { simulation: null, page: null };

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const statusOf = (view: SimulationView, tags: TagRecord[], settled: boolean): SimulatedStatus | null => {
  const { simulation } = view;
  if (!simulation?.enabled || !simulation.install) return null;
  return simulatedStatus(simulation.install, view.page, tags, settled);
};

export const useSimulation = ({ active, tabId, site, push, generation, tags, settled }: Inputs): SimulationState => {
  const [view, setView] = useState<SimulationView>(NONE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active || tabId === null) return;
    let current = true;
    ask({ type: "simulation/read", tabId })
      .then((read) => current && setView(read))
      // An older background knows nothing about simulations: nothing is simulated, as far as it goes.
      .catch(() => current && setView(NONE));
    return () => {
      current = false;
    };
  }, [active, tabId, site, generation]);

  useEffect(() => {
    if (push && push.site === site) setView(push.view);
  }, [push, site]);

  /** One change at a time, its failure said where the operator is looking. */
  const change = useCallback(async <T>(work: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError("");
    try {
      return await work();
    } catch (err) {
      setError(message(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const applied = useCallback(
    (work: () => Promise<SimulationView>) =>
      void change(work).then((next) => {
        if (next) setView(next);
      }),
    [change],
  );

  const remove = useCallback(
    async (target: string = site): Promise<SiteSimulation[]> => {
      const left = await change(() =>
        ask({ type: "simulation/remove", site: target, ...(tabId === null ? {} : { tabId }) }),
      );
      if (left && target === site) setView(NONE);
      return left ?? [];
    },
    [change, site, tabId],
  );

  return {
    ...view,
    status: statusOf(view, tags, settled),
    busy,
    error,
    install: (url) => {
      if (tabId !== null) applied(() => ask({ type: "simulation/install", tabId, url }));
    },
    pause: (enabled) => {
      if (tabId !== null) applied(() => ask({ type: "simulation/pause", tabId, enabled }));
    },
    remove,
  };
};
