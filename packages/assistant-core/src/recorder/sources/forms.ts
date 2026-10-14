import { guard } from "@mediajel/tracker-core/utils/guard";
import { Source } from "@mediajel/assistant-core/recorder/recorder";
import { selectorFor } from "@mediajel/assistant-core/recorder/selector";
import { maskValue } from "@mediajel/assistant-core/session/masking";
import { FormFieldSnapshot } from "@mediajel/assistant-core/types";

/**
 * Capture-phase submit listener: sees the form even when the page's own handler calls
 * preventDefault (SPAs almost always do). Values go through the mask at capture — a raw email
 * or card number never reaches the timeline.
 */
export const formsSource: Source = ({ page, emit }) => {
  const onSubmit = guard((event: Event): void => {
    if (page.isOwn(event)) return;
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    const fields: FormFieldSnapshot[] = [];
    for (const element of Array.from(form.elements)) {
      const input = element as HTMLInputElement;
      if (!input.name || input.type === "submit" || input.type === "button") continue;
      if (fields.length >= 30) break;
      fields.push({
        name: input.name,
        type: input.type ?? "",
        value: input.type === "password" ? "<masked>" : maskValue(input.name, String(input.value ?? "")),
      });
    }

    emit(
      {
        kind: "form",
        selector: selectorFor(form),
        action: form.getAttribute("action") ?? "",
        method: (form.getAttribute("method") ?? "get").toLowerCase(),
        fields,
        summary: `submit ${selectorFor(form)} (${fields.map((f) => f.name).join(", ")})`,
      },
      { flush: true, scoreText: fields.map((f) => f.name).join(" ") },
    );
  }, "forms-record");

  document.addEventListener("submit", onSubmit, true);
  return () => document.removeEventListener("submit", onSubmit, true);
};
