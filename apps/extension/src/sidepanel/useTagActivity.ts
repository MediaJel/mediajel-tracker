import { useEffect, useMemo, useRef, useState } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";

import { ask } from "~/bridge/api";
import type { TagActivity } from "~/service/client";

/**
 * The last 7 days of every MediaJel tag on the page, as the panel shows them.
 *
 * Each state is a different sentence on screen, so none of them is folded into another: a page
 * that has not had its moment to load a tag is not a page without tags, and a failed lookup is not
 * a quiet week. Showing zeros for either would be the kind of lie this product exists to avoid.
 */
type ActivityPhase =
  /** No tag is known on the page yet, and the page has not had its moment to load one. */
  | "listening"
  /** The page settled and carries no MediaJel tag — there is nothing to look up, but listening goes on. */
  | "no-tags"
  /** Asking the service, with nothing on screen yet. */
  | "loading"
  /** One answer per app ID is on screen (some may be `unavailable`). */
  | "ready"
  /** The lookup failed as a whole. */
  | "error"
  /** The assistant service has no activity source configured. */
  | "not-configured";

/** What a lookup has to show for itself. */
interface Lookup {
  phase: ActivityPhase;
  /** One answer per app ID, in the page's order. Kept on screen while a refresh is in flight. */
  results: TagActivity[];
  refreshing: boolean;
  error: string;
}

export interface TagActivityState extends Lookup {
  /** The page's tags this is about, in the order first seen, each with its state. */
  tags: TagRecord[];
  reportOpen: boolean;
  refresh(): void;
  openReport(): void;
  closeReport(): void;
}

const NOTHING: Lookup = { phase: "listening", results: [], refreshing: false, error: "" };

/** No lookup to make: `null` app IDs mean no tag is known yet, `""` that the page settled without one. */
const idle = (appIds: string | null): Lookup => ({ ...NOTHING, phase: appIds === null ? "listening" : "no-tags" });

/**
 * Asking again keeps whatever readings are up — for the tags already on screen, and while a tag
 * heard later joins them. Rows that were right a moment ago do not become a skeleton.
 */
const pending = (current: Lookup): Lookup =>
  current.phase === "ready" ? { ...current, refreshing: true, error: "" } : { ...NOTHING, phase: "loading" };

const answer = async (appIds: string): Promise<Lookup> => {
  try {
    const { tags } = await ask({ type: "service/tag-activity", appIds: appIds.split(",") });
    return { ...NOTHING, phase: "ready", results: tags };
  } catch (err) {
    const failure = err as Error & { code?: string };
    const phase = failure.code === "activity-not-configured" ? "not-configured" : "error";
    return { ...NOTHING, phase, error: failure.message };
  }
};

interface Inputs {
  /** Whether a job is on screen at all. Nothing is asked for otherwise. */
  active: boolean;
  site: string;
  /** Every tag known on the page, from every source, in the order first seen. */
  tags: TagRecord[];
  /** Whether the page has had its moment to load a tag. */
  settled: boolean;
}

export const useTagActivity = ({ active, site, tags, settled }: Inputs): TagActivityState => {
  const [lookup, setLookup] = useState<Lookup>(NOTHING);
  const [reportOpen, setReportOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /** Which request is current, so a slow answer for a page we have left can never land. */
  const requestRef = useRef(0);

  // Every push is a new array; the app IDs it names are what decide a lookup.
  const key = useMemo(() => [...new Set(tags.map((tag) => tag.appId).filter(Boolean))].join(","), [tags]);
  // The app IDs to look up — empty when the page settled without a tag, null while nothing is known yet.
  const wanted = tags.length > 0 ? key : settled ? "" : null;

  useEffect(() => {
    setReportOpen(false);
  }, [site]);

  useEffect(() => {
    if (!active) return;
    const request = ++requestRef.current;
    if (!wanted) {
      setLookup(idle(wanted));
      setReportOpen(false);
      return;
    }
    setLookup(pending);
    void answer(wanted).then((next) => {
      if (request !== requestRef.current) return;
      setLookup(next);
      // Details has nothing to show without readings; left open, it would come back uninvited later.
      setReportOpen((open) => open && next.phase === "ready");
    });
  }, [active, wanted, attempt]);

  return {
    ...lookup,
    tags,
    reportOpen,
    refresh: () => setAttempt((value) => value + 1),
    openReport: () => setReportOpen(true),
    closeReport: () => setReportOpen(false),
  };
};
