import { EventsObservableEvents } from "src/shared/types";

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
    notify: (data: Partial<EventsObservableEvents>) => listeners.forEach((fn) => fn(data)),
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
