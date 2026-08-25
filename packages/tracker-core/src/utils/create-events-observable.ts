import logger from "@mediajel/tracker-core/logger";
import { EventsObservableEvents } from "@mediajel/tracker-core/types";

const createObservable = () => {
  const listeners: Array<(data: Partial<EventsObservableEvents>) => void> = [];

  return {
    listeners,
    subscribe: (fn: (data: Partial<EventsObservableEvents>) => void) => {
      listeners.push(fn);
    },
    unsubscribe: (fn: (data: Partial<EventsObservableEvents>) => void) => {
      const index = listeners.indexOf(fn);
      if (index > -1) listeners.splice(index, 1);
    },
    notify: (data: Partial<EventsObservableEvents>) => {
      let firstError: unknown;
      let threw = false;
      listeners.forEach((fn) => {
        try {
          fn(data);
        } catch (error) {
          // One bad subscriber must not break delivery to the others.
          if (!threw) {
            threw = true;
            firstError = error;
          }
          logger.error(
            "Observable subscriber threw:",
            error instanceof Error ? error.stack || error.message : error,
          );
        }
      });
      // Producers rely on data-channel throws: ecwid/tymber gate their DOM
      // fallbacks on notify throwing, and adapter-handler moves to the next
      // adapter — so rethrow once the fan-out is complete. Never rethrow an
      // error-channel notify: the reporter must not throw (recursion).
      if (threw && !data.errorEvent) throw firstError;
    },
  };
};

const createEventsObservable = (() => {
  let instance: ReturnType<typeof createObservable> | null = null;
  return () => {
    if (!instance) {
      instance = createObservable();
    }
    return instance;
  };
})();

const observable = createEventsObservable();

export default observable;
