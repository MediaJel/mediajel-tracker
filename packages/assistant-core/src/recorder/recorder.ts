import { guard } from "@mediajel/tracker-core/utils/guard";
import { PageContext } from "@mediajel/assistant-core/context";
import logger from "@mediajel/assistant-core/log";
import { scoreEvent } from "@mediajel/assistant-core/recorder/score";
import { beaconSource } from "@mediajel/assistant-core/recorder/sources/beacon";
import { clicksSource } from "@mediajel/assistant-core/recorder/sources/clicks";
import { dataLayerSource } from "@mediajel/assistant-core/recorder/sources/datalayer";
import { fetchSource } from "@mediajel/assistant-core/recorder/sources/fetch";
import { formsSource } from "@mediajel/assistant-core/recorder/sources/forms";
import { mutationsSource } from "@mediajel/assistant-core/recorder/sources/mutations";
import { navigationSource } from "@mediajel/assistant-core/recorder/sources/navigation";
import { platformSource } from "@mediajel/assistant-core/recorder/sources/platform";
import { postMessageSource } from "@mediajel/assistant-core/recorder/sources/post-message";
import { storageSource } from "@mediajel/assistant-core/recorder/sources/storage";
import { xhrSource } from "@mediajel/assistant-core/recorder/sources/xhr";
import { newId } from "@mediajel/assistant-core/session/ids";
import { TimelineEvent, WidgetPage } from "@mediajel/assistant-core/types";

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
  page: PageContext;
  /** Append one event. `flush` marks the events a crash must not lose. */
  emit(draft: DraftEvent, opts?: { flush?: boolean; scoreText?: string }): void;
  /** The recording crossed into a new page/route; returns the new page id. */
  newPage(url: string, title?: string): string;
  pageId(): string;
}

export type Source = (host: SourceHost) => () => void;

/**
 * Where a recording goes.
 *
 * The engine stamps events and hands them over; it owns no storage. In the extension the
 * main-world bridge posts them to the relay and the background writes them, which is the whole
 * reason recording survives the navigations this flow depends on — the page can be torn down
 * mid-checkout and the session is already somewhere else.
 */
export interface RecorderSink {
  event(event: TimelineEvent, opts?: { flush?: boolean }): void;
  page(page: WidgetPage): void;
  /** Called on stop, so a sink that buffers can write before the page may go away. */
  flush(): void;
}

export interface RecorderInput {
  page: PageContext;
  sink: RecorderSink;
  /** Milliseconds since the recording started. */
  now(): number;
}

export interface Recorder {
  start(): void;
  stop(): void;
  running(): boolean;
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

export const createRecorder = ({ page, sink, now }: RecorderInput): Recorder => {
  let disposers: (() => void)[] = [];
  let currentPageId = "";

  const newPage = (url: string, title = document.title): string => {
    const entry: WidgetPage = { id: newId("pg"), url, title, t: now() };
    currentPageId = entry.id;
    sink.page(entry);
    sink.event({
      id: newId("ev"),
      t: entry.t,
      pageId: entry.id,
      kind: "page",
      summary: `page ${url}`,
      score: 0,
    });
    return entry.id;
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
    sink.event(stamped, { flush: opts?.flush });
  };

  const host: SourceHost = { page, emit, newPage, pageId: () => currentPageId };

  return {
    start: () => {
      if (disposers.length > 0) return;
      newPage(page.href);
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
      sink.flush();
      logger.debug("Recording stopped");
    },

    running: () => disposers.length > 0,
  };
};
