import { guard } from "@mediajel/tracker-core/utils/guard";
import { Source } from "@mediajel/assistant-core/recorder/recorder";
import { maskObject } from "@mediajel/assistant-core/session/masking";

/**
 * Embedded checkouts (Dutchie, Jane, payment iframes) report the purchase to the parent page
 * with postMessage — for those sites this IS the signal. Data is masked and truncated; the
 * integrations sandbox's own `{__mj: …}` control messages are noise and skipped.
 */
export const postMessageSource: Source = ({ emit }) => {
  const onMessage = guard((event: MessageEvent): void => {
    const data: unknown = event.data;
    if (data && typeof data === "object" && "__mj" in (data as Record<string, unknown>)) return;

    let payload: unknown;
    let preview: string;
    if (typeof data === "string") {
      preview = data.slice(0, 200);
      payload = maskObject(data.length > 2_048 ? `${data.slice(0, 2_048)}…` : data);
    } else if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      preview = Object.keys(record).slice(0, 5).join(", ");
      payload = maskObject(record);
    } else {
      return; // numbers/booleans/null carry no signal worth a row
    }

    emit(
      {
        kind: "message",
        origin: event.origin,
        data: payload,
        summary: `message from ${event.origin || "the page"} (${preview})`,
      },
      { scoreText: typeof data === "string" ? data.slice(0, 1_000) : JSON.stringify(data ?? "").slice(0, 1_000) },
    );
  }, "postmessage-record");

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
};
