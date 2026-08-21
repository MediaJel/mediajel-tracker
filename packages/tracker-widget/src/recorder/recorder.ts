import { guard } from "@mediajel/tracker-core/utils/guard";
import { WidgetContext } from "@mediajel/tracker-widget/context";
import logger from "@mediajel/tracker-widget/log";
import { scoreEvent } from "@mediajel/tracker-widget/recorder/score";
import { beaconSource } from "@mediajel/tracker-widget/recorder/sources/beacon";
import { clicksSource } from "@mediajel/tracker-widget/recorder/sources/clicks";
import { dataLayerSource } from "@mediajel/tracker-widget/recorder/sources/datalayer";
import { fetchSource } from "@mediajel/tracker-widget/recorder/sources/fetch";
import { formsSource } from "@mediajel/tracker-widget/recorder/sources/forms";
import { mutationsSource } from "@mediajel/tracker-widget/recorder/sources/mutations";
import { navigationSource } from "@mediajel/tracker-widget/recorder/sources/navigation";
import { platformSource } from "@mediajel/tracker-widget/recorder/sources/platform";
import { postMessageSource } from "@mediajel/tracker-widget/recorder/sources/post-message";
import { storageSource } from "@mediajel/tracker-widget/recorder/sources/storage";
import { xhrSource } from "@mediajel/tracker-widget/recorder/sources/xhr";
import { newId } from "@mediajel/tracker-widget/session/ids";
import { TimelineEvent, WidgetPage } from "@mediajel/tracker-widget/types";

/**
 * The recording engine: eleven sources, one emit path, one place that decides what an event
 * is stamped with. Sources observe and call through — the page must behave exactly as it
 * would have without us — and hand this module a draft; ids, timestamps, page attribution
 * and the score are stamped here so no source can get them inconsistently wrong.
 */

/** A timeline event as a source produces it: everything but the stamps. */
export type DraftEvent = TimelineEvent extends infer E
  ? E extends TimelineEvent
    ? Omit<E, "id" | "t" | "pageId" | "score">
    : never
  : never;

export interface SourceHost {
  widget: WidgetContext;
  /** Append one event. `flush` persists synchronously — for the events a crash must not lose. */
  emit(draft: DraftEvent, opts?: { flush?: boolean; scoreText?: string }): void;
  /** The recording crossed into a new page/route; returns the new page id. */
  newPage(url: string, title?: string): string;
  pageId(): string;
}

export type Source = (host: SourceHost) => () => void;

export interface Recorder {
  start(): void;
  stop(): void;
  running(): boolean;
  /** Counts by kind for the live Recording body. Derived from the session, cheap to call. */
}

const SOURCES: Source[] = [
  platformSource,
  fetchSource,
  xhrSource,
  beaconSource,
  dataLayerSource,
  formsSource,
  clicksSource,
  navigationSource,
  mutationsSource,
  storageSource,
  postMessageSource,
];

export const createRecorder = (widget: WidgetContext): Recorder => {
  let disposers: (() => void)[] = [];
  let currentPageId = "";

  const now = (): number => Math.max(0, Date.now() - widget.session.get().startedAt);

  const newPage = (url: string, title = document.title): string => {
    const page: WidgetPage = { id: newId("pg"), url, title, t: now() };
    currentPageId = page.id;
    widget.session.update((draft) => {
      draft.pages.push(page);
      draft.timeline.push({
        id: newId("ev"),
        t: page.t,
        pageId: page.id,
        kind: "page",
        summary: `page ${url}`,
        score: 0,
      });
    });
    return page.id;
  };

  const emit: SourceHost["emit"] = (draft, opts) => {
    const stamped = {
      ...draft,
      id: newId("ev"),
      t: now(),
      pageId: currentPageId,
      score: 0,
    } as TimelineEvent;
    stamped.score = scoreEvent(stamped, opts?.scoreText ?? "");

    widget.session.update((session) => {
      session.timeline.push(stamped);
    });
    if (opts?.flush) widget.session.flush();
  };

  const host: SourceHost = { widget, emit, newPage, pageId: () => currentPageId };

  return {
    start: () => {
      if (disposers.length > 0) return;
      newPage(location.href);
      for (const source of SOURCES) {
        try {
          disposers.push(source(host));
        } catch (err) {
          // One source failing (a page that froze fetch, an exotic Storage) must not cost the
          // other ten. The gap is named so the operator can see what will be missing.
          logger.warn("A recording source could not be installed:", err);
        }
      }
      logger.debug("Recording started", { pageId: currentPageId });
    },

    stop: () => {
      const toDispose = disposers;
      disposers = [];
      for (const dispose of toDispose) guard(dispose, "recorder-dispose")();
      widget.session.flush();
      logger.debug("Recording stopped");
    },

    running: () => disposers.length > 0,
  };
};
