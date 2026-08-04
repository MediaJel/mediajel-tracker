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
    notify: (data: Partial<EventsObservableEvents>) =>
      listeners.forEach((fn) => {
        try {
          fn(data);
        } catch (error) {
          // One bad subscriber must not break delivery to the others — and notify
          // is on the error path now, so never notifyError from here (recursion).
          logger.error("Observable subscriber threw:", error);
        }
      }),
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
