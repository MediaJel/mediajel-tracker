import { QueryStringContext } from "@mediajel/tracker-core/types";
import { WidgetRuntime } from "@mediajel/tracker-widget/runtime";
import { SessionStore } from "@mediajel/tracker-widget/session/store";
import { SettingsStore } from "@mediajel/tracker-widget/session/settings";
import { WidgetHost } from "@mediajel/tracker-widget/ui/host";

/**
 * Everything a widget subsystem is allowed to reach for.
 *
 * The recorder, the generator, verify and deploy all receive one of these instead of importing
 * globals. That is what makes the two rules enforceable rather than aspirational: own traffic
 * goes through `runtime`, so a key can never land in the recording; and anything the operator
 * does inside the card is filtered out with `isOwn`, so the widget never records itself.
 */
export interface WidgetContext {
  /** The tag's parsed query string, handed over by the stub. */
  tag: QueryStringContext;
  /** `fetch` and XHR as they were before anything wrapped them. */
  runtime: WidgetRuntime;
  host: WidgetHost;
  session: SessionStore;
  settings: SettingsStore;
  /** Whether an event or node belongs to the widget rather than the page. */
  isOwn: WidgetHost["isOwn"];
}
