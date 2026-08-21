import { guard } from "@mediajel/tracker-core/utils/guard";
import { Source } from "@mediajel/tracker-widget/recorder/recorder";
import { selectorFor } from "@mediajel/tracker-widget/recorder/selector";
import { maskText } from "@mediajel/tracker-widget/session/masking";
import { DomSnapshotItem } from "@mediajel/tracker-widget/types";

/**
 * The confirmation the page shows the customer — "Thank you", "Order #1042" — is sometimes
 * the only machine-visible signal a site has. One observer on the whole document, batched to
 * 300ms, keeping only added text that matches the confirmation shapes, capped per page.
 */

const CONFIRMATION_RE = /thank|order|confirm|receipt|success|complete|purchased|#\s?\d{3,}|(?:\$|€|£)\s?\d/i;
const BATCH_MS = 300;
const MAX_ITEMS_PER_PAGE = 200;

export const mutationsSource: Source = ({ widget, emit }) => {
  if (typeof MutationObserver !== "function") return () => undefined;

  let pending: DomSnapshotItem[] = [];
  let captured = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flushBatch = guard((): void => {
    timer = null;
    if (pending.length === 0) return;
    const items = pending.slice(0, 12);
    pending = [];
    emit(
      {
        kind: "dom",
        items,
        summary: `page showed "${items[0].text.slice(0, 60)}"${items.length > 1 ? ` +${items.length - 1} more` : ""}`,
      },
      { scoreText: items.map((item) => item.text).join(" ") },
    );
  }, "mutations-batch");

  const consider = (node: Node): void => {
    if (captured >= MAX_ITEMS_PER_PAGE) return;
    if (!(node instanceof Element) && !(node instanceof Text)) return;
    const el = node instanceof Text ? node.parentElement : node;
    if (!el || widget.isOwn(el)) return;
    const text = (node.textContent ?? "").trim().replace(/\s+/g, " ");
    if (!text || text.length < 3 || !CONFIRMATION_RE.test(text)) return;

    captured += 1;
    pending.push({ selector: selectorFor(el), text: maskText(text.slice(0, 160)) });
    if (timer === null) timer = setTimeout(flushBatch, BATCH_MS);
  };

  const observer = new MutationObserver(
    guard((records) => {
      for (const record of records) {
        if (record.type === "characterData") consider(record.target);
        else for (const node of Array.from(record.addedNodes)) consider(node);
      }
    }, "mutations-record"),
  );
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  return () => {
    observer.disconnect();
    if (timer !== null) clearTimeout(timer);
  };
};
