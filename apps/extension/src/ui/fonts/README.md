# Fonts

Two variable faces, latin subset, self-hosted.

They are here because the brand pins **Futura** for display and **Avenir Next** for body, and a
font stack cannot deliver either: on a machine without them the panel silently fell through to
Century Gothic, or to the platform sans, and looked like a different product on every desk. These
are the open realizations of the two faces the brand already chose —

- **Jost** (indestructible type*, SIL OFL 1.1) — a Futura revival. Display, labels, stamps.
- **Mulish** (Vernon Adams / Cyreal, SIL OFL 1.1) — humanist geometric in Avenir's proportions. Body.

Both are variable across the whole weight axis, which is why there is one file each rather than
one per weight. Mono stays a system stack (SF Mono → ui-monospace): it appears only inside code
and identifiers, where the platform's own is excellent and costs nothing to ship.

Refresh with the `family=<Name>:wght@400;600` CSS from Google Fonts and keep only the `U+0000-00FF`
subset — the panel has no cyrillic or greek copy.
