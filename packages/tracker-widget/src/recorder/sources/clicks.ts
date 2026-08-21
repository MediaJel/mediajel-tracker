import { guard } from "@mediajel/tracker-core/utils/guard";
import { Source } from "@mediajel/tracker-widget/recorder/recorder";
import { selectorFor } from "@mediajel/tracker-widget/recorder/selector";

/**
 * Capture-phase clicks on things that look actionable. Capture phase matters twice over: the
 * page cannot stop the event before we see it, and on a checkout the click usually IS the last
 * thing before a navigation.
 */
export const clicksSource: Source = ({ widget, emit }) => {
  const onClick = guard((event: Event): void => {
    if (widget.isOwn(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const actionable = target.closest("a, button, [role='button'], input[type='submit'], input[type='button']");
    if (!actionable || widget.isOwn(actionable)) return;

    const text = (actionable.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    emit({
      kind: "click",
      selector: selectorFor(actionable),
      tag: actionable.tagName,
      text,
      href: actionable instanceof HTMLAnchorElement ? actionable.href : null,
      summary: `click "${text || selectorFor(actionable)}"`,
    });
  }, "clicks-record");

  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
};
