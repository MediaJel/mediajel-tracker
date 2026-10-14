import { useCallback, useEffect, useRef, useState } from "react";

import { LedgerView } from "@mediajel/assistant-core/wire/types";
import { applyDelta, mergeRead } from "@mediajel/assistant-core/wire/view";

import { Push, ask } from "~/bridge/api";

/**
 * The ledger as the panel holds it: what the background has kept for this tab, plus every push
 * since, newest first.
 *
 * Read once when a job comes on screen and again on every reconnect — the worker recycles, the
 * port dies with it, and whatever was pushed meanwhile is not resent — with a request counter so
 * a slow answer for a page we have left can never land. Pushes are deltas, applied in place; a
 * push that beats the read is kept when the read lands.
 */

type LedgerPhase = "idle" | "loading" | "ready" | "error";

export interface WireEventsState extends LedgerView {
  phase: LedgerPhase;
  error: string;
  /** Rows that arrived while the ledger was not on screen. */
  unseen: number;
  openLedger(): void;
  closeLedger(): void;
  clear(): void;
}

export type EventsPush = Extract<Push, { type: "events" }>;

interface Inputs {
  /** Whether a job is on screen at all. Nothing is asked for otherwise. */
  active: boolean;
  tabId: number | null;
  site: string;
  /** The latest `events` push, as the panel received it. */
  delta: EventsPush | null;
  /** Bumped on every port reconnect and every job load: the cue to read again. */
  generation: number;
}

const empty = (site: string): LedgerView => ({ site, pages: [], events: [], dropped: 0, seq: 0 });

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export const useWireEvents = ({ active, tabId, site, delta, generation }: Inputs): WireEventsState => {
  const [view, setView] = useState<LedgerView>(empty(site));
  const [phase, setPhase] = useState<LedgerPhase>("idle");
  const [error, setError] = useState("");
  const [unseen, setUnseen] = useState(0);
  const requestRef = useRef(0);
  const openRef = useRef(false);

  useEffect(() => {
    if (!active || tabId === null) return;
    const request = ++requestRef.current;
    setPhase("loading");
    ask({ type: "events/read", tabId })
      .then((read) => {
        if (request !== requestRef.current) return;
        setView((current) => (current.site === read.site ? mergeRead(current, read) : read));
        setPhase("ready");
        setError("");
      })
      .catch((err) => {
        if (request !== requestRef.current) return;
        setPhase("error");
        setError(message(err));
      });
  }, [active, tabId, generation]);

  useEffect(() => {
    if (!delta || delta.site !== site) return;
    setView((current) => applyDelta(current.site === site ? current : empty(site), delta));
    if (!openRef.current) setUnseen((count) => count + delta.appended.length);
  }, [delta, site]);

  const openLedger = useCallback(() => {
    openRef.current = true;
    setUnseen(0);
  }, []);
  const closeLedger = useCallback(() => {
    openRef.current = false;
  }, []);
  const clear = useCallback(() => {
    if (tabId === null) return;
    setView(empty(site));
    void ask({ type: "events/clear", tabId });
  }, [tabId, site]);

  return { ...view, phase, error, unseen, openLedger, closeLedger, clear };
};
