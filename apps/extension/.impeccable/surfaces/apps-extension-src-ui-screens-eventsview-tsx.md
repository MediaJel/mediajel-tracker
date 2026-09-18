---
version: 1
slug: "apps-extension-src-ui-screens-eventsview-tsx"
primary_target: "apps/extension/src/ui/screens/EventsView.tsx"
related_targets: ["apps/extension/src/ui/ledger.ts","apps/extension/src/sidepanel/useWireEvents.ts"]
---

Scope: the Events view of the side panel — the ledger of what this tab's MediaJel tag sends. Visitor
mode: Operate.

Audience: MediaJel integration engineers proving a client's tag, who today keep the Snowplow
Inspector open beside the panel and still cannot see the partner pixels the tag fires; clients later.

Task: watch what the page sends as it sends it — the page view, the page pings, the tag's own
`record` of its configuration, transactions and items, and the Nexxen, Dstillery and LiquidM
signals it fires from its segment parameters — decoded into plain names and attributed to the app
ID they belong to; open one and read its receipt; notice a blocked send or a partner pixel with no
matching transaction.

Proof the surface must carry: every collector event decoded field by field with its schema names;
every partner signal named for its partner and occasion and matched to the tag's own configuration;
custom-tag fetches and registered third-party tags named by what they are; the status word when a
request failed or was blocked; and the line that says all of it is read from the tab's own traffic
and none of it leaves the browser.

Constraints: 400px wide, full height, one column — never two panes; capture lives per tab in
session storage and dies with the tab; `chrome.webRequest` sees the request and its outcome but no
response headers or cookies, so no server-anonymisation or network-user-id affordances; no schema
validation in this cut (no request to Iglu Central); other vendors' Snowplow trackers are heard only
while a panel is open and shown apart; the Snowplow Inspector is reference for the protocol only —
its code and label strings are under the Snowplow Community License and are never reused.

Direction: a ledger, not a console. Every collector event, partner beacon and tag fire this tab
made, newest first, grouped under the page that made it with a zero-padded count in mono; one row
per event — a family mark, a plain name, the time in mono, the tag or partner it belongs to, a
status word only when something went wrong; a row opens in place into its receipt: three facts,
then the payload in groups behind hairlines, entities named by schema and version with Data or
JSON, every value with a monochrome type chip; filtered by a search and four families; cleared with
a word. terrabis.co shows the full shape (page view, page ping, the `record` event with its
entities, the Dstillery pixel at `00000` because the tag defaulted it, the LiquidM sync, the
custom-tag fetch); unity-rd.com shows a v1 tag beside another vendor's tracker.

Memorable moment: the `record` row opening into the tag's own configuration — every parameter the
tag runs with, read off the wire, under the app ID it belongs to.

Unresolved: whether Google Ads conversions (dataLayer pushes, never a request) should be rows;
whether tags inside embedded-menu iframes should be heard with a frame badge; Iglu Central
validation and its Schema/Errors tabs; whether the view remembers itself per site.

## Direction contract

THESIS: a ledger of what the page sent, newest first under the page that sent it, each line
opening into its own receipt; it refuses the two-pane inspector and the scrolling log console.

OWN-WORLD: the work order's stock and sheet; page bands on carbon with the count in mono; rows in
the body face with the clock in mono; family marks drawn at 1.5px on the 16px grid like the
zigzag; groups behind hairlines; type chips as monochrome Badge chips; the only colours are the
warning word and the identity link; nothing purple, because nothing here leaves the browser.

STORY: I open Events and see the page view, then the tag's own record, then the partner pixels it
fired, each named plainly and attributed to its app ID; I open one and read its receipt; I filter
to partners and see the Dstillery pixel say it was never configured; I know nothing here left the
browser.

FIRST VIEWPORT: the strip with EVENTS printed on the sheet; the view's heading line — Events, the
count on this tab, Clear; the filter row with its search and the four families; the privacy line;
the first page band with its zero-padded count and the page's label; the newest rows under it,
each with its mark, name, second line and clock.

FORM: the ledger — rows that open in place, the sealed slip's own idiom — as a local extension of
the carbon-stack world (seed ea35aae4); shaped directly, no roll, because the request pinned the
form.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance
