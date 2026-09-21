# DESIGN — the Integrations Assistant panel ("The Carbon Stack")

> Rendition revised 2026-08-24 on the brief "more beautiful, less tech", and rebuilt on shadcn and
> Tailwind on 2026-09-18 with the identity unchanged. The structure below is the same one; what
> changed is how it is written: every colour is a `light-dark()` token, every control is one of
> shadcn's components re-cut for the sheet, and every screen's look is said in its component's
> classes. There is no second stylesheet. The rebuild also brought the tag's week onto the main
> panel, under the tally, and made detection something that never asks for a reload.

The panel is **one integration job sheet per site, kept as carbon copies**. Every finished step
seals into a stamped slip that stays readable above the live work, and the one next action is
pinned at the bottom saying what it will do. It refuses the wizard-with-progress-dots and the chat
transcript. Concept: carbon-copy stack, #3 of 7 ordered structures, seed `ea35aae4`
(`--scope surface --mode operate`); direction contract at the top of `src/ui/App.tsx`.
Mode: **Operate** — scanability, honesty and task completion outrank expression.

This continues the world of the in-page widget ("The Work Order", seed `edfb6964`) rather than
replacing it: same paper, same stamps, same zigzag. What changed is what a full-height surface
makes possible. The 380px card could only afford one open section, so finished work collapsed to a
row and everything else went away. A panel has the height to keep the whole record, and the
structure uses it.

## Tokens (`:root` in `src/ui/globals.css` — the single source of truth)

Each token is one `light-dark(light, dark)` pair, and `color-scheme` is the single switch: the OS
decides by default, and Settings' explicit choice, stamped as `data-theme` on the root, wins in
both directions. Nothing has a second definition inside a media or `[data-theme]` block.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--mj-stock` | `#efeae0` | `#14120f` | the ground the stack sits on |
| `--mj-sheet` | `#fbf8f2` | `#1d1a16` | the live sheet |
| `--mj-carbon` | `#e6e0d3` | `#171512` | a sealed step's carbon copy |
| `--mj-carbon-ink` | `#33406b` | `#93a6dd` | the impression a carbon copy leaves |
| `--mj-days-ink` / `-wash` | `#495da7` / 12% carbon-ink | `#6a81ce` / 16% | the by-day columns, and the wash under the day being read |
| `--mj-ink` / `-soft` / `-faint` | `#1a1713` / `#5b5348` / `#948b7c` | `#f2ede4` / `#a89f92` / `#6f675c` | text tiers (`-faint` is disabled/decorative only) |
| `--mj-rule` | `#d8d0c0` | `#38332c` | the few remaining hairlines, zigzag at rest |
| `--mj-identity` | `#1f4fe0` | `#7fa0ff` | the live ink: REC, primary, focus, links, in-progress stamps |
| `--mj-platform` | `#0b8f6b` | `#4fd6ac` | VERIFIED (outline), DEPLOYED (filled — the only filled stamp) |
| `--mj-partner` | `#db4a15` | `#ff9666` | warnings, problems, destructive |
| `--mj-privacy` | `#6c34e8` | `#c0a6ff` | anything that leaves the browser |
| `--mj-platform-text` / `--mj-warning-text` | `#087a5a` / `#ab3d14` | `#4fd6ac` / `#fcac86` | platform and partner **as text**: the inks above measured 3.8:1 and 3.96:1 on the light sheet, under the 4.5 floor |
| `--mj-on-ink` / `--mj-stamp-fill` | `#ffffff` / `#0a7f5f` | `#14120f` / `#4fd6ac` | text on a filled ground, and the one filled stamp's ground (white on platform was 4.3:1) |
| geometry | radius 3px (`--radius-sm/md/lg`), 4px for the suggestion card · pad 20px | | paper, not pill |
| `wide:` | `@media (width >= 40rem)` | | the one breakpoint: the ledger's receipt beside its rows instead of under them; nothing else changes with width |
| `--mj-press` | `inset 0 1px 0 rgba(26,23,19,.07), inset 0 2px 0 rgba(255,255,255,.55)` | | a rule impressed into stock, not drawn on it |

`@theme inline` maps these onto shadcn's vocabulary — `bg-primary` is the identity ink,
`text-muted-foreground` is soft ink, `border-border` is a rule, `chart-1` is the days ink — and
adds the panel's own names as utilities (`text-carbon-ink`, `border-privacy`, `bg-stock`…), the
two faces (`font-display`, `font-sans`, `font-mono`), the pixel type scale (`text-3xs` 9 …
`text-title` 27) and the tracking steps (`tracking-caps`, `-stamp`, `-label`). Motion is a token
too: `--animate-stamp-land`, `--animate-wash`, `--animate-settling`, `--animate-rec`, each used
only behind a reduced-motion guard.

**The neutrals are warm.** The brand recorded cool `#E6E9EB` paper and `#FFFFFF` card, which is
screen paper. Pulp is never `#FFFFFF`, and the cool greys were half of why the panel read as a
console. The four brand inks — identity, platform, partner, privacy — are **untouched**; they are
the part anyone would recognise, and they do all the work they did before.

**The sheet inverts.** `prefers-color-scheme` decides by default; Settings carries an explicit
Light / Dark / System control. Two things do not survive the inversion on their own and are tokens
of their own (`--mj-stamp-blend`, `--mj-mark-filter`): the stamp's `mix-blend-mode: multiply` (ink
soaking into paper only reads that way *on* paper; over the ink ground the same blend subtracts
the stamp into the background) and the MJ mark, a single raster drawn as dark ink, which is
inverted rather than shipped twice.

## Type (two faces, self-hosted)

- **Display — Jost** (SIL OFL), a Futura revival. The job title at 27px, step names at 15/600,
  the wordmark and stamps in caps. This is the Futura the brand pins, actually delivered.
- **Body — Mulish** (SIL OFL), humanist geometric in Avenir's proportions. 14px/1.55.
- **Mono — SF Mono → ui-monospace.** A system stack on purpose, because it now appears *only*
  where there is machine text: code, field identifiers, function names, the `+12s` column, the
  live REC readout. Not as a costume for "technical".

The stacks were replaced because a stack could not deliver either face: on a machine without
Futura the panel fell through to Century Gothic, or to the platform sans, and looked like a
different product on every desk. Both files are variable across the weight axis, latin subset,
56 KB together — see `src/ui/fonts/README.md`. The `@font-face` rules live in `src/ui/base.css`.

## Components (`src/ui/components`)

The controls are shadcn's (style `radix-nova`, Radix primitives imported per package — never the
unified barrel, which Plasmo's build would ship whole) under `components/ui`, owned here: pruned to
the exports the panel uses, with no `disabled:` styles (the panel marks a control `aria-disabled`
and says why), no focus ring of their own (the base layer draws the 2px identity ring on
everything), and no zoom or fade on open (stamps are the single authored motion). `cn` comes from
`src/lib/utils.ts`, configured with the panel's scale.

| Piece | What it is here |
|---|---|
| `Button` | a rule in the role colour on a 3px corner, body face, semibold. `default` is the one identity-filled control; `outline` the ghost; `destructive` a partner rule with warning-text ink; `secondary` + `size="pill"` the who-pill; `ghost` + `size="icon"` the round icon buttons; `link` the inline links. `working` keeps the ink, presses in and washes the label. |
| `Alert` | the notice: a slip on stock with a full 1px rule in identity, partner or privacy ink — never a coloured left edge |
| `Popover` (via `InfoTip`) | the ⓘ disclosure: click, Escape, focus return, portalled out of whatever card it sits in |
| `Collapsible` | a sealed slip: its row is the trigger, its record the content |
| `AlertDialog` | "Start over?": a modal slip laid across the top of the sheet in partner ink, not a centred card |
| `Input`, `Textarea`, `Field`/`FieldLabel`/`FieldSet`/`FieldLegend` | fields on the sheet, labelled by id; machine text in mono |
| `Checkbox`, `RadioGroup`, `ToggleGroup` | the acknowledgement; the deploy target cards (the item is the whole card, its look from `has-data-checked:`); the theme track |
| `Table` | ruled rows inside one rule: the field coverage. The tally is a plain table — nothing boxed |
| `Card` | the suggestion — the one softer corner and cast shadow, ruled in identity ink |
| `Badge` | `pill` numbers a capture, `chip` names "replayed"; labels, never signals |
| `Skeleton` | the sheet settling: carbon stock with a wash passing across it |
| `Chart` (`ChartContainer`, `ChartTooltip`) | recharts with its chrome taken away, for the by-day bands |
| `Stamp` | custom, on cva: caps, 2px rule in the role colour, −4°, the one landing animation; `filled` for DEPLOYED; `soft` (soft ink) for a PAUSED simulation |
| `Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`) | index tabs: the chosen view printed on the sheet, the others on the ground, no underline |
| `Letterhead`, `Panel`/`Stack`, `ActionBar`, `ViewTabs`, `Chevron`, `Section` pieces, `Definitions`, `DayBands` | the sheet's own vocabulary, written once |

## Vocabulary

**Letterhead** (mark 18px · MEDIAJEL · hairline · WORK ORDER, with Start-over and gear at the
right) → **the job title**: the site set as a 27px headline, with the job type and the signed-in
person beneath it. The app id and the file the tag will become are machine facts and wait in the
configuration slip, the Deploy step and Settings, where they are actionable → **zigzag rule**
(48-tooth inline SVG, `vector-effect: non-scaling-stroke`; identity-coloured while recording) →
**the view tabs** → the view: **the tally** (Overview) · **Analytics** · **the carbon stack**
(Tracking setup) → **the action bar** (Tracking setup only).

**The view tabs** are index tabs of a paper file: a strip on stock directly under the zigzag with
a hairline at its foot, the three names in the display face at 11px, semibold, tracked and
uppercase — structure, in the letterhead's voice — and the chosen view printed on the sheet
(sheet background, the slips' pressed shadow, a rounded top, standing on the rule) while the
others stay on the ground in soft ink. No underline: an identity underline is the console idiom,
and a coloured edge is refused everywhere else on the sheet. No counts on tabs, which would move
the strip on every push; a view's own heading line carries its count. The setup tab carries the
recording light while a recording is live, so the fact is visible from every other view. Radix
supplies the roving focus and the arrow keys; focus never moves on a tab switch, and never on a
data change. Settings takes the strip and the view's place rather than covering them.

**No section numerals.** The order still carries meaning, and the stack's own order carries it;
`01`–`05` beside the names was what made a work order read as a specification. The steps are named
for what they produce — Record, The event, The tag, Proof, Deploy.

**The carbon stack** is the structure. A step behaves one of three ways:

- **Sealed** — tinted like a carbon copy of the sheet, its receipt on its own line in carbon
  blue, its stamp landed, still openable in place (a `Collapsible`). Five receipts read top to
  bottom are a complete account of the job.
- **Live** — the full sheet, at the bottom of the stack, nearest the thumb.
- **Ahead** — named and present, deliberately *not* given a slip: there is no record to put on
  one yet, and inventing one would be the first lie in a product whose whole argument is that it
  does not.

**The action bar** is pinned to the bottom: one primary button and one line saying what it will do,
or why it cannot. It exists because in a document that scrolls, a primary action living inside the
current section moves every time that section changes size — and because an action that is always
in the same place can afford to explain itself. No section draws its own primary action.

**The simulator** is the Overview's first section, above the tally, on the same sheet: a tag
installed on this site from its URL, in this browser only, on every page until it is paused or
removed — how an engineer tries a tag before a client has installed anything. Closed, it is one line
in the tally's heading voice, `SIMULATE A TAG` with "on terrabis.co" beside it and a chevron, and a
hairline under it, so on a site that has its tag it never outweighs the readings. Opened, it is the
`Tag URL` field in mono (prefilled with the last URL simulated, else the build's tag); once the URL
reads as a MediaJel tag's, its configuration prints in the configuration slip's own groups, said to
be "read from the URL", with a **Fields | Config object** toggle — the object is the params as the tag
builds them, in a Machine block with *Copy the object*; the collector is left out, since the tag's
build sets it, not its URL. A refusal is said in warning ink only once the operator has written
something ("That isn't a MediaJel tag URL: it is served from widget.example.com."). One line in privacy
purple says what running it means — it sends to MediaJel's collector as an installed tag would — and
the one identity button says *Simulate on terrabis.co*. Simulating, the section is a record: `SIMULATED
TAG` with the app ID in mono under it and a `SIMULATED` stamp in identity ink at the right (a paused
one says `PAUSED` in soft ink), where it loads, and what became of it on the page — said from what
the page's tags actually did: "Running on this page.", "Running beside the page's own tag, so both
send page views.", or, in warning ink, "The page's own tag started first, so this copy is silent" and
"The page refused the tag's script". The script URL waits one disclosure down; *Pause* (outline) and
*Remove* (link) are the two ways out. Every change reloads the tab it came from — a tag only starts at
the top of a page — and the toolbar says `SIM` on every tab of a simulated site, so a forgotten
simulation is never invisible; Settings lists every simulated tag in this browser with *Remove*.

**The tally** is the Overview's second section, on the same sheet: what MediaJel recorded from every
MediaJel tag on the page over the last 7 days — Page views, Transactions, Sign-ups, Sessions. It is
the first thing the work order shows because it is a fact about the site: true before the job
starts, and where the first real conversions show up after Deploy. It is a reading, not a dashboard — never the
big-number-small-label hero row: `TAG ACTIVITY` in the letterhead's caps with the range beside it,
then one reading per tag, each headed by the app ID it is about in mono with the tag's environment,
version and state under it in soft ink — a number never appears without the tag it belongs to —
the four counts under that with their names printed small above them, zeros in soft ink, a hairline
between one tag's reading and the next (past three, the rest are in Details), and one sentence in
carbon ink only when it says something about the job in hand ("Page views are arriving, but no
transactions were recorded."). Past three readings the rest are in Analytics, and the note says so
with the way there. Every state is its own sentence (listening for the page's tags, no tag, failed, not configured); zeros never stand in
for an answer, and no sentence ever asks for a page to be reloaded — detection attaches, listens and
re-reads on its own. A problem is set in ink, not partner orange: the orange is under 4.5:1 as text
on the light sheet, so it stays a border colour.

**The configuration slip** hangs under an app ID in Overview and Analytics alike: a `Collapsible`
closed by default, its trigger the words "Tag configuration" with the chevron, in the display face
like the tally's own controls. Open, it is the tag's whole setup in words, from the highest-ranked
source that has spoken — the tag's own `record` event on the wire, after any overrides on the
page; else its announcement; else the script on the page — and a source line says which. Identity
(app ID, environment, version with the SDK it implies, event, collector), Audience segments
(LiquidM; Nexxen page-view and transaction beacons; Dstillery page-view and transaction, with a
legacy name noted and `00000` printed as "not configured (tag default)"), Plugins, Controls, and
Other parameters for whatever else the URL carried; labels in soft ink, values in mono that wrap
anywhere because a Nexxen segment is ninety opaque characters, and the script's own markup last, as
machine text. A tag heard only on the wire has no slip: the line under its app ID already says the
page names nothing about it. LiquidM is read the way the tag reads it — `segmentId` before `s1`.

**Editing a configuration** happens in the Overview's slip (Analytics' stays read-only). Under the
groups sits *Edit* (outline); editing turns them into fields in the same two columns — mono inputs,
every param the tag reads by name listed whether it is set or not ("not set" as a placeholder),
version as two choices (`1 · sp.js` / `2 · cnna.js`), environment suggesting the tag's adapters, and
*Add a parameter* for anything else — with the same **Fields | Config object** toggle, the object
being the params the block merges into `window.overrides["<appId>"]`. A changed field says
`edited · was <value> · Undo` (the word in identity ink); a param an edit already made set says
"set by the edit already made · Stop overriding"; an edit that renames the tag, redirects it or
switches it off says so in warning ink, and only when the value actually changes. The editor starts
from the edit already tried on the page, else the one deployed to the tag's app-id file, so it never
drops what an earlier edit set. One privacy-purple line says what trying sends — the tag's app ID
and the edit, to the assistant service, which writes the code — and the identity button says what
it will do: *Try 2 changes on this page*. Tried, the slip says "2 edits tried on this page" in
identity ink beside its trigger, closed or open, marks each tried value `tried` in the same ink, and
offers *Edit* again or *Stop trying the edit*; a tag that fetched its app-id file before the edit
reached the page gets one warning line and *Apply again*. When the activity service has no numbers
(failed, or not set up), the Overview still prints each tag's heading and configuration above the
note, so an edit never depends on the counts.

**The ledger** is the Events view: every event this tab's page was heard sending — collector
events, partner beacons, custom-tag fetches and the third-party tags they register — newest first
under the page that made it, in a rail of rows with the receipt of the chosen row beside it. From
40rem (`wide:`, the panel's one breakpoint — a side panel dragged wide) the rail is a 16rem column
on the left and the receipt prints in the pane on its right, so the next event is one click, never
an open and a close; under 40rem the rows keep the width and the receipt is a drawer beneath them,
put away with its × or Escape. A page's band sits on carbon with its count as a mono pill, two
digits at least, and the page's label (the host at the root, else the path, an off-site host under
it). One row per event: a family mark drawn at 1.5px like the zigzag (a collector's tray, a
beacon's pixel, the platform and network kinds for custom and other tags), a plain name ("Page
view", "Page ping", "record", "Transaction", "Item"), and a second line in soft ink that opens with
the clock in mono, then the tag it belongs to (in mono when it is machine text — an app id, a
host, a tracker's name), a fact worth reading (an order and its total, a schema's name and version)
and a status word only when something went wrong ("sending…" in soft ink; "failed (503)" and
"blocked" in warning ink — a word, never a colour alone); when the line is short of room the fact
yields first, who is cut at six tenths of the line (half, in the rail beside the pane), and the
status word never yields. The rows are one Tab
stop: Up and Down walk them, Home and End jump, the receipt follows, and Escape puts it away from
either side; the chosen row sits on carbon with `aria-current` and a chevron in soft ink pointing
at its receipt — right, beside the pane; down, at the drawer. Every scroll container's bar is thin
and in the rule colour (`scrollbar-rule`). The receipt is a slip of
its own on the stock: a head that stays put while the rest scrolls — the mark, the name in the
display face, the transport as a chip, the status word — then three facts and the payload in parts
behind hairlines, every part open with a chevron to fold it (Event, App, User, Session, Page,
Browser, Device, Ping, Transaction, Item, Entities), each a ruled table of key in mono, value, and a
monochrome chip naming the value's type; entities and self-describing events as blocks headed by
`name/version` with the vendor in fine print and a Data | JSON toggle; the tag's own `record` event
prints its configuration by the slip's own groups. Before a row is chosen the pane says so in a
margin note. Above both, pinned so the filter stays at hand while the rail scrolls: the heading with
the count on this tab and "Clear"; a search and five families (All · Collector · Partners · Custom ·
Other), side by side from 40rem; and one line in soft ink, deliberately not privacy purple, saying
all of it is read from the tab's own traffic and none of it leaves the browser. Other vendors'
trackers keep to their own closed group at the foot of the rail, "Other trackers on this page", so
an engineer can tell ours from theirs without confusing the two; a partner beacon's receipt says
which tag it was attributed to and by which parameter. Empty, it listens; filtered to nothing, it
says what nothing matched; past the memory cap, one line says how many of the oldest were let go.
New rows announce themselves politely, at most once every four seconds. Schema and Errors are what
the Data | JSON toggle grows when Iglu validation arrives; nothing is drawn for them until it does.

**The week** sits inside the reading of the tag the tally's sentence singles out, under its counts:
two bands — page views, and the job's own measure — at 40px plots under a one-line caption naming
the day being read ("By day · Today so far · Wed, Sep 16", following the pointer or the arrow keys,
the latest day at rest; the day's counts follow it for a screen reader only). It dims with the
readings while a refresh is in flight, and says nothing at all when the tag has no days; Details
draws every band of every tag.

**Analytics** is the second view: one sheet per tag on the stock, the last of them torn off like
the stack's, and — while there are no readings — the same sentence Overview prints, on one sheet,
so the tab never opens on nothing. A sheet reads top to bottom in one order: the
full app id in mono and the tag's environment, version and state; the four counts in the tally's
form, in full; the transaction total and ad impressions once there are any; the last transaction
and sign-up as sentences; then, each under its own heading behind a hairline, the days and the
conversions by page — a ruled table of path in mono (an off-site host under it), conversions and
total, ten rows then all of them with a filter. Pages are printed, never linked: every listed page
is one where a conversion fired, and opening it runs the client's tag, so a click from here could
add to the counts or record a test purchase in production. The total carries no currency symbol,
because the data carries no currency and "USD" is only a tag's default. A tag that could not be
read gets a warning notice, with the service's own words behind its ⓘ. When an endpoint can read
further back than the 7-day table, the range control belongs at the top of this view, not in the
heading.

**By day** is the figure on each report sheet, and the week on the main panel: the tag's last days
as columns, one band per measure — Page views, Transactions, Sign-ups, Sessions, and the
transaction total once there is any — each on its own scale, because page views run hundreds of
times the conversions and one axis would flatten them onto the baseline. Each band is a small
multiple on shadcn's Chart (recharts): the columns are carbon ink one step deeper (`--mj-days-ink`,
so a 16px column clears 3:1 on the sheet); today's is at half strength because it is still
filling; the wash under the day being read is the only colour that moves, and it is drawn in every
band of the figure. One day is read at a time — the latest at rest, whichever the pointer or the
arrow keys choose — and each band prints that day's count in its header beside its name, the way
the tally prints a name and its number; under a pointer the band being hovered also says the day
and its count in a tip beside the column. A band's scale is one figure at the right end of its top
hairline, rounded to the next clean tick; a flat band prints no scale and is the answer "none". The oldest of the eight days is not drawn: the 7-day table has
already let its early events expire, and it would read as a slump that never happened. Days are
UTC, and say so; a screen reader gets the same numbers as a table.

**The tear.** The zigzag opens the stack at the top; the last sheet closes it with a matching
perforated edge (the `tear-bottom` utility, a conic-gradient mask), so the ground below reads as
the desk the ticket is lying on rather than as something missing.

**Stamps**: caps, 2px border in the role colour, −4°, one 240ms landing animation. This is the
panel's single authored moment of motion.
**Info disclosures** (`ⓘ`): the answer to "what does this mean?", one click away, so the surface
stays a work order rather than becoming its own manual. A disclosure, not a hover tooltip — hover
excludes keyboards and touch, and this is a tool people use all day. It never sits inside another
button: the deploy target's ⓘ is beside the card's text, not inside the card that chooses it.
**Notices**: ruled paper slips with a full 1px border in the role colour — never side accent bars.
Nothing anywhere is marked with a coloured left edge: what is chosen is printed on the sheet while
what is not stays on the ground, which is what the material can already say.

**Icons** are drawn in `icons.tsx` at 1.5px on a 16px grid, sharing the zigzag's stroke. No unicode
glyph stands in for one — a `✕` or an `ⓘ` inherits the text face's weight and never matches.
**Timeline rows**: kind dot on a rail, `+s` in mono, summary, the pin pill that shows itself under
the pointer or focus. **Coverage rows**: `field · STATUS · source/value` (platform-text from the
page, soft = default, warning-text = missing). **Code**: mono 11px on a paper inset, editable.

## Rules

- Every colour is a token; nothing has its only definition inside a media or `[data-theme]` block.
- Keyboard reachable everywhere (`aria-disabled`, never `disabled`, on rows); 2px identity focus
  ring from the base layer; stamps carry text, never colour alone; every animation sits behind a
  reduced-motion guard (`motion-safe:` or the utility's own media query).
- Text is never set in an ink under 4.5:1 on its ground: platform and partner as text take
  `platform-text` and `warning-text`; the filled stamp takes `stamp-fill`.
- Copy is plain and client-readable; buttons say what happens; warnings state cause and
  consequence; privacy purple marks every byte that leaves the browser before it does; nothing
  ever asks for a page to be reloaded.
- The panel is ~400px and full height. Nothing may assume more width: at this size a receipt and a
  stamp cannot share a line, which is why the receipt takes its own.
- A screen's picture of record is its reference in `e2e/__screenshots__`, in both themes; a change
  that moves a pixel regenerates them and says so.

## Other surfaces

**Popup** — sign in, or open the panel. It exists for the one thing the panel cannot do for a
first-time user: get them signed in before there is anything to show.
**Jobs list** — every site worked on, most recent first, the current one marked the way a work
order marks its live section. This screen is the reason the extension exists.
Both inherit the letterhead and the tokens; neither gets a stack or an action bar it has no use for.
