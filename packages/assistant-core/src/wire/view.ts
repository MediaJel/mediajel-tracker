import type { LedgerView, TabLedger } from "@mediajel/assistant-core/wire/types";

/**
 * The ledger as the panel reads it. The ledger keeps its events oldest first, the order they
 * were appended in; the panel reads newest first, the order an operator watches a page in.
 */
export const viewOf = (ledger: TabLedger): LedgerView => ({
  site: ledger.site,
  events: [...ledger.events].reverse(),
  pages: [...ledger.pages].reverse(),
  dropped: ledger.dropped,
  seq: ledger.seq,
});
