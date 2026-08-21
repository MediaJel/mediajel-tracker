/**
 * The browser's own networking, captured before anyone wraps it.
 *
 * Two things depend on this. First, privacy: the widget's own traffic — the prompt to the
 * provider and the commit to GitHub — must never appear in the recording, or an API key ends
 * up inside a stored request body and then inside the next prompt. Second, correctness: the
 * recorder wraps `fetch` and `XMLHttpRequest` to watch the page, and a wrapper that called
 * itself would recurse.
 *
 * `captureRuntime()` therefore runs once, at chunk load in widget.ts, BEFORE the recorder
 * patches anything, and the result is carried on the widget context. Everything the widget
 * sends goes through these references; nothing else in the package may call `fetch` directly.
 *
 * It is a best effort by construction: if the host page had already replaced `fetch` before
 * the chunk loaded, what we capture is that replacement. There is no earlier moment available
 * to code that loads on demand.
 */
export interface WidgetRuntime {
  /** `window.fetch` as it was, pre-bound so it survives being destructured. */
  pristineFetch: typeof fetch;
  /** Unbound prototype methods — call them as `pristineXhrOpen.call(xhr, …)`. */
  pristineXhrOpen: XMLHttpRequest["open"];
  pristineXhrSend: XMLHttpRequest["send"];
}

export const captureRuntime = (): WidgetRuntime => ({
  pristineFetch: window.fetch.bind(window),
  pristineXhrOpen: XMLHttpRequest.prototype.open,
  pristineXhrSend: XMLHttpRequest.prototype.send,
});
