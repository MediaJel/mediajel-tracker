import { guard } from "@mediajel/tracker-core/utils/guard";

export const postMessageSource = (callback: (event: MessageEvent<any>) => void): void => {
  window.addEventListener(
    "message",
    guard((event: MessageEvent<any>): void => {
      // Host traffic can postMessage(null) — a null/undefined payload is unusable
      // by every consumer, so drop it here instead of per-callsite.
      if (event.data == null) return;
      callback(event);
    }, "post-message"),
    false,
  );
};
