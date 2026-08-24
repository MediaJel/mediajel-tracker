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

Task: record a real purchase or sign-up on the client's page → mark the event → have the service
write the tag → prove it on that page with nothing reaching the collector → deploy to master.

Proof the surface must carry: what was actually recorded, which field came from the page versus a
default, what the tag fired when it ran. The product's argument is that it works from evidence, so
the evidence stays visible rather than being summarised away.

Constraints: ~400px wide, full height, docked all day; light and dark. The recorder and Verify run
in the client's page realm, so anything the panel shows about the page arrives over a bridge and
may be absent (no tag, opted out, page not loaded yet). Nobody holds a credential — sign-in is the
whole gate.

Direction: the carbon-copy stack (seed ea35aae4). Sealed steps compress to stamped slips that stay
readable above the live sheet; the one next action is pinned at the bottom saying what it will do.

Memorable moment: the receipt line on each sealed slip — five of them read top to bottom are the
whole job, and they are what makes coming back to a site days later cheap.

Unresolved: how deploys get gated once clients have access; whether the job list needs search or
archiving once an engineer has hundreds; whether tag injection should be offered before sign-in.
