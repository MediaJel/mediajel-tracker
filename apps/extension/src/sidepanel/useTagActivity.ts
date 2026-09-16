import { useEffect, useMemo, useRef, useState } from "react";

import { TagSummary } from "@mediajel/assistant-core/context";
import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";

import { ask } from "~/bridge/api";
import { tagsOf } from "~/lib/status";
import type { TagActivity } from "~/service/client";

/**
 * The last 7 days of every MediaJel tag on the page, as the panel shows them.
 *
 * Each state is a different sentence on screen, so none of them is folded into another: a page
 * that has not reported its tags yet is not a page without tags, and a failed lookup is not a
 * quiet week. Showing zeros for either would be the kind of lie this product exists to avoid.
 */
type ActivityPhase =
  /** The page has not said which tags it carries yet. */
  | "waiting"
  /** The page reported, and carries no MediaJel tag — there is nothing to look up. */
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
  /** The page's tags this is about, in page order: environment, version, whether held back. */
  tags: TagSummary[];
  /** The page has been silent for a while — usually a tab that loaded before the extension did. */
  slow: boolean;
  reportOpen: boolean;
  refresh(): void;
  openReport(): void;
  closeReport(): void;
}

const SLOW_AFTER_MS = 4_000;

const NOTHING: Lookup = { phase: "waiting", results: [], refreshing: false, error: "" };

/** No lookup to make: `null` app IDs mean the page has not reported, `""` that it carries no tag. */
const idle = (appIds: string | null): Lookup => ({ ...NOTHING, phase: appIds === null ? "waiting" : "no-tags" });

/** Asking again for the tags already on screen keeps their answers up while the new ones come. */
const pending = (current: Lookup, again: boolean): Lookup =>
  again ? { ...current, refreshing: true, error: "" } : { ...NOTHING, phase: "loading" };

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

/** Whether the page has kept quiet about its tags for longer than a page normally takes. */
const usePageSilence = (active: boolean, statusKnown: boolean, site: string): boolean => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!active || statusKnown) return;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [active, statusKnown, site]);
  return slow;
};

interface Inputs {
  /** Whether a job is on screen at all. Nothing is asked for otherwise. */
  active: boolean;
  site: string;
  status: TrackerStatus;
  /** Whether `status` came from this site's page, rather than being the empty placeholder. */
  statusKnown: boolean;
  /** App IDs the page has been heard sending events from — continuous, and independent of the page's scripts. */
  heard: string[];
}

export const useTagActivity = ({ active, site, status, statusKnown, heard }: Inputs): TagActivityState => {
  const [lookup, setLookup] = useState<Lookup>(NOTHING);
  const [reportOpen, setReportOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // A tag heard sending is an answer even while the page itself has said nothing.
  const known = statusKnown || heard.length > 0;
  const slow = usePageSilence(active, known, site);

  /** Which request is current, so a slow answer for a page we have left can never land. */
  const requestRef = useRef(0);
  /** The app IDs the answers on screen belong to. */
  const shownRef = useRef("");

  // Every status push is a new object; the app IDs it names are what decide a lookup.
  const tags = useMemo(() => tagsOf(status, heard), [status, heard]);
  const key = useMemo(() => [...new Set(tags.map((tag) => tag.appId).filter(Boolean))].join(","), [tags]);
  // The app IDs to look up — empty when the page reported no tag, null until it has reported at all.
  const wanted = known ? key : null;

  useEffect(() => {
    setReportOpen(false);
  }, [site]);

  useEffect(() => {
    if (!active) return;
    const request = ++requestRef.current;
    if (!wanted) {
      shownRef.current = "";
      setLookup(idle(wanted));
      setReportOpen(false);
      return;
    }
    const again = shownRef.current === wanted;
    setLookup((current) => pending(current, again));
    void answer(wanted).then((next) => {
      if (request !== requestRef.current) return;
      shownRef.current = next.phase === "ready" ? wanted : "";
      setLookup(next);
      // Details has nothing to show without readings; left open, it would come back uninvited later.
      setReportOpen((open) => open && next.phase === "ready");
    });
  }, [active, wanted, attempt]);

  return {
    ...lookup,
    tags,
    slow,
    reportOpen,
    refresh: () => setAttempt((value) => value + 1),
    openReport: () => setReportOpen(true),
    closeReport: () => setReportOpen(false),
  };
};
