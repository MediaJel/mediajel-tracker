# DESIGN — the Integrations Assistant panel ("The Carbon Stack")

> Rendition revised 2026-08-24 on the brief "more beautiful, less tech". The structure below is
> unchanged; the material is now warm letterpress rather than console printout, and machine
> detail sits behind disclosures instead of on the surface. What that meant in practice:
> mono only where there is literally machine text, no hairline boxes, no `01`/`02` numerals, the
> two brand faces self-hosted rather than hoped for, and receipts written as sentences.

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

## Tokens (`:root` in `src/ui/styles.css` — the single source of truth)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--mj-stock` | `#efeae0` | `#14120f` | the ground the stack sits on |
| `--mj-sheet` | `#fbf8f2` | `#1d1a16` | the live sheet |
| `--mj-carbon` | `#e6e0d3` | `#171512` | a sealed step's carbon copy |
| `--mj-carbon-ink` | `#33406b` | `#93a6dd` | the impression a carbon copy leaves |
| `--mj-ink` / `-soft` / `-faint` | `#1a1713` / `#5b5348` / `#948b7c` | `#f2ede4` / `#a89f92` / `#6f675c` | text tiers (`-faint` is disabled/decorative only) |
| `--mj-rule` | `#d8d0c0` | `#38332c` | the few remaining hairlines, zigzag at rest |
| `--mj-identity` | `#1f4fe0` | `#7fa0ff` | the live ink: REC, primary, focus, links, in-progress stamps |
| `--mj-platform` | `#0b8f6b` | `#4fd6ac` | VERIFIED (outline), DEPLOYED (filled — the only filled stamp) |
| `--mj-partner` | `#db4a15` | `#ff9666` | warnings, problems, destructive |
| `--mj-privacy` | `#6c34e8` | `#c0a6ff` | anything that leaves the browser |
| geometry | radius 3px · pad 20px | | paper, not pill |
| `--mj-press` | `inset 0 1px 0 rgba(26,23,19,.07), inset 0 2px 0 rgba(255,255,255,.55)` | | a rule impressed into stock, not drawn on it |

**The neutrals are warm now.** The brand recorded cool `#E6E9EB` paper and `#FFFFFF` card, which is
screen paper. Pulp is never `#FFFFFF`, and the cool greys were half of why the panel read as a
console. The four brand inks — identity, platform, partner, privacy — are **untouched**; they are
the part anyone would recognise, and they do all the work they did before.

**The sheet inverts now.** The old rule — a paper document floating over someone's dark checkout
must stay paper — was right, and has nothing to say about a panel docked in the browser's own
chrome for eight hours. `prefers-color-scheme` decides by default; Settings carries an explicit
Light / Dark / System control that stamps `data-theme` and wins in both directions.

Two things do not survive the inversion on their own and are handled: the stamp's
`mix-blend-mode: multiply` (ink soaking into paper only reads that way *on* paper; over the ink
ground the same blend subtracts the stamp into the background) and the MJ mark, a single raster
drawn as dark ink, which is inverted rather than shipped twice.

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
56 KB together — see `src/ui/fonts/README.md`.

## Vocabulary

**Letterhead** (mark 18px · MEDIAJEL · hairline · WORK ORDER, with Start-over and gear at the
right) → **the job title**: the site set as a 27px headline, with the job type and the signed-in
person beneath it. The app id and the file the tag will become are machine facts and wait in the
Deploy step and in Settings, where they are actionable → **zigzag rule** (48-tooth inline SVG,
`vector-effect: non-scaling-stroke`; identity-coloured while recording) → **the carbon stack** →
**the action bar**.

**No section numerals.** The order still carries meaning, and the stack's own order carries it;
`01`–`05` beside the names was what made a work order read as a specification. The steps are named
for what they produce — Record, The event, The tag, Proof, Deploy.

**The carbon stack** is the structure. A step behaves one of three ways:

- **Sealed** (`.mj-slip`) — tinted like a carbon copy of the sheet, its receipt on its own line in
  carbon blue, its stamp landed, still openable in place. Five receipts read top to bottom are a
  complete account of the job.
- **Live** (`.mj-sheet`) — the full sheet, at the bottom of the stack, nearest the thumb.
- **Ahead** (`.mj-ahead`) — named and present, deliberately *not* given a slip: there is no record
  to put on one yet, and inventing one would be the first lie in a product whose whole argument is
  that it does not.

**The action bar** is pinned to the bottom: one primary button and one line saying what it will do,
or why it cannot. It exists because in a document that scrolls, a primary action living inside the
current section moves every time that section changes size — and because an action that is always
in the same place can afford to explain itself. No section draws its own primary action.

**The tear.** The zigzag opens the stack at the top; the last sheet closes it with a matching
perforated edge (a conic-gradient mask), so the ground below reads as the desk the ticket is lying
on rather than as something missing.

**Stamps**: caps, 2px border in the role colour, −4°, one 240ms landing animation. This is the
panel's single authored moment of motion.
**Info disclosures** (`ⓘ`): the answer to "what does this mean?", one click away, so the surface
stays a work order rather than becoming its own manual. A disclosure, not a hover tooltip — hover
excludes keyboards and touch, and this is a tool people use all day.
**Notices**: ruled paper slips with a full 1px border in the role colour — never side accent bars.
Nothing anywhere is marked with a coloured left edge: what is chosen is printed on the sheet while
what is not stays on the ground, which is what the material can already say.

**Icons** are drawn in `icons.tsx` at 1.5px on a 16px grid, sharing the zigzag's stroke. No unicode
glyph stands in for one — a `✕` or an `ⓘ` inherits the text face's weight and never matches.
**Timeline rows**: kind badge (a pill on stock, display face), `+s` in mono, summary, signal dot ≥5.
**Coverage rows**: `field · STATUS · source/value` (platform green from the page, soft = default,
partner = missing). **Code**: mono 11px on a paper inset, editable.

## Rules

- Every colour is a token; nothing has its only definition inside a media or `[data-theme]` block.
- Keyboard reachable everywhere (`aria-disabled`, never `disabled`, on rows); 2px identity focus
  ring; stamps carry text, never colour alone; `prefers-reduced-motion` kills all motion.
- Copy is plain and client-readable; buttons say what happens; warnings state cause and
  consequence; privacy purple marks every byte that leaves the browser before it does.
- The panel is ~400px and full height. Nothing may assume more width: at this size a receipt and a
  stamp cannot share a line, which is why the receipt takes its own.

## Other surfaces

**Popup** — sign in, or open the panel. It exists for the one thing the panel cannot do for a
first-time user: get them signed in before there is anything to show.
**Jobs list** — every site worked on, most recent first, the current one marked with the identity
edge. This screen is the reason the extension exists.
Both inherit the letterhead and the tokens; neither gets a stack or an action bar it has no use for.
