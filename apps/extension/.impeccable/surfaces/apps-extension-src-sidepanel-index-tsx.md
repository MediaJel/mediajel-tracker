---
version: 1
slug: "apps-extension-src-sidepanel-index-tsx"
primary_target: "apps/extension/src/sidepanel/index.tsx"
related_targets: ["apps/extension/src/ui/App.tsx"]
---

Scope: the extension's side panel — the whole Integrations Assistant. Visitor mode: Operate.

Audience: MediaJel integration engineers, signed in with their dashboard account, working one
client site at a time while that client waits for tracking to be confirmed. Roadmap: clients
themselves, so the copy is already client-readable.

Task: read what the site's tags are doing (Overview, Analytics, Events), then record a real
purchase or sign-up on the client's page → mark the event → have the service write the tag →
prove it on that page with nothing reaching the collector → deploy to master (Tracking setup).

Proof the surface must carry: what was actually recorded, which field came from the page versus a
default, what the tag fired when it ran, and what the page's tags send and are configured with.
The product's argument is that it works from evidence, so the evidence stays visible rather than
being summarised away.

Constraints: ~400px wide, full height, docked all day; light and dark. The recorder and Verify run
in the client's page realm, so anything the panel shows about the page arrives over a bridge and
may be absent (no tag, opted out, page not loaded yet). Nobody holds a credential — sign-in is the
whole gate.

Direction: the carbon-copy stack (seed ea35aae4), read in views since 2026-09-19: a strip of
index tabs under the zigzag — Overview, Analytics, Events, Tracking setup — with the chosen tab
printed on the sheet and the others on the ground; the tally is the Overview, Analytics prints every
reading in full, Events is the ledger, and Tracking setup holds the stack, where sealed steps
compress to stamped slips that stay readable above the live sheet and the one next action is pinned
at the bottom saying what it will do. Under every app ID, the tag's configuration is one disclosure
away. The Overview opens on the simulator — one quiet line until it is used; opened, a tag URL and
its configuration as fields or as the object the tag builds; simulating, a stamped record of the tag
loaded on every page of the site in this browser, with what became of it on the page said from what
the page's tags did — then the tally, where each tag's configuration can be edited and tried on
the page, the edit served through the tag's own app-id file exactly as a deploy would leave it.

Memorable moment: the receipt line on each sealed slip — five of them read top to bottom are the
whole job, and they are what makes coming back to a site days later cheap.

Unresolved: how deploys get gated once clients have access; whether the job list needs search or
archiving once an engineer has hundreds; whether the panel should remember its view per site.
Resolved 2026-09-22: tag injection is the simulator on the Overview, behind sign-in like everything
else, and kept per site until removed.
