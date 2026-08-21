# DESIGN — the Integrations Assistant ("The Work Order")

The widget is **one integration job sheet**: a paper document that fills in top-to-bottom
and stamps each finished section. It refuses the stepper-with-progress-dots and the chat
bubble. Concept: work order, #3 of 7 ordered structures, seed `edfb6964`
(`--scope surface --mode operate`); direction contract at the top of `src/ui/App.tsx`.
Mode: **Operate** — scanability, honesty and task completion outrank expression.

## Tokens (`:host` in `src/ui/styles.ts` — the single source of truth)

| Token | Value | Role |
|---|---|---|
| `--mj-paper` | `#e6e9eb` | ground behind the card, insets, chips |
| `--mj-card` | `#ffffff` | the sheet |
| `--mj-ink` / `-soft` / `-faint` | `#14161a` / `#565c66` / `#8a9199` | text tiers (`-faint` is for disabled/decorative ONLY — 3.19:1) |
| `--mj-rule` | `#c7cdd3` | hairlines, borders, zigzag at rest |
| `--mj-identity` | `#1f4fe0` | the live ink: REC, primary buttons, focus, links, in-progress stamps |
| `--mj-platform` | `#0b8f6b` | VERIFIED (outline) and DEPLOYED (filled — the only filled stamp) |
| `--mj-partner` | `#db4a15` | warnings, problems, destructive |
| `--mj-privacy` | `#6c34e8` | anything that leaves the browser |
| geometry | radius 4px · pad 12px · row 36px · shadow `0 16px 40px rgba(20,22,26,.28)` | paper, not pill |

The card **never inverts** — it is a document and stays paper-light over dark host pages.

## Type (system stacks only; no webfonts on client pages)

- Display/labels: Futura → Century Gothic → Avenir Next, 9–11px caps, tracking `.06–.12em`.
- Body: Avenir Next → system, 13px (12px dense), 1.35, weights 400/600 only.
- Mono: SF Mono → ui-monospace, 10–12px, `tabular-nums` — data, ids, code, times.

## Vocabulary

Letterhead (mark 20px · MEDIAJEL · hairline · doc title · gear/collapse) → Site/App/Job
definition rows (44px label column) → **zigzag rule** (48-tooth inline SVG,
`vector-effect: non-scaling-stroke`; identity-colored while recording) → five numbered
section rows (`01 Record … 05 Deploy`, caps, chevron rotates when open, future sections
dimmed but present — nothing disappears). Stamps: caps, 2px border in role color, −4°,
`mix-blend-mode: multiply`, one 240ms landing animation. Notices: ruled paper slips with a
full 1px border in the role color — never side accent bars. Timeline rows: 28px — kind badge
(mono, boxed), `+s`, summary, signal dot ≥5. Exhibits: identity-bordered box, tinted rows.
Coverage rows: `field · STATUS · source/value` (platform green = from page, soft = default,
partner = missing). Code: mono 11px on paper inset, editable. Buttons: identity filled
primary / ink outline ghost / partner outline danger, 32px, radius 3px. Launcher chip:
40px paper tag with the mark; REC dot while recording.

## Rules

- All styles inside the shadow root; host carries `all: initial` + fixed corner + max z.
  UA styles still apply inside shadow roots — `ol/li/dl/dd` are explicitly reset.
- ≤480px: full-width bottom sheet, 85vh, 8px top radius.
- Keyboard reachable everywhere (aria-disabled, never `disabled`, on rows); 2px identity
  focus ring; stamps carry text, never color alone; `prefers-reduced-motion` kills all
  motion.
- Copy is plain and client-readable; buttons say what happens; warnings state cause and
  consequence; privacy purple marks every byte that leaves the browser before it does.
