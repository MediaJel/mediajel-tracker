import { guard } from "@mediajel/tracker-core/utils/guard";
import { Source } from "@mediajel/assistant-core/recorder/recorder";

/**
 * SPA route changes. `pushState`/`replaceState` are patched call-through-first (the pattern
 * tracker-core's trans-deduplicator uses — and like it, no synthetic popstate is dispatched);
 * `popstate` and `hashchange` are plain listeners. Full page loads are recorded by the
 * recorder itself when it re-arms after the reload.
 *
 * Every nav starts a new WidgetPage, so later events attribute to the page they happened on.
 */
export const navigationSource: Source = ({ emit, newPage }) => {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  let from = location.href;

  const record = (sub: "pushState" | "replaceState" | "popstate" | "hashchange"): void => {
    const to = location.href;
    if (to === from) return;
    emit({ kind: "nav", sub, from, to, summary: `${sub} → ${to}` }, { flush: true, scoreText: to });
    newPage(to);
    from = to;
  };

  history.pushState = function (...args: Parameters<History["pushState"]>) {
    const result = originalPush.apply(this, args);
    guard(() => record("pushState"), "nav-pushstate")();
    return result;
  };
  history.replaceState = function (...args: Parameters<History["replaceState"]>) {
    const result = originalReplace.apply(this, args);
    guard(() => record("replaceState"), "nav-replacestate")();
    return result;
  };

  const onPop = guard(() => record("popstate"), "nav-popstate");
  const onHash = guard(() => record("hashchange"), "nav-hashchange");
  window.addEventListener("popstate", onPop);
  window.addEventListener("hashchange", onHash);

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener("popstate", onPop);
    window.removeEventListener("hashchange", onHash);
  };
};
