/**
 * The widget's ONLY door to third-party code.
 *
 * `bun build` pre-bundles this file into `dist/vendor.js`, which Parcel then sees as a single
 * local ES module (see the "//vendor" note in package.json for the two failures that forced
 * this). Nothing under `src/` may import `preact` or `zod` by its bare name (the AI SDK itself
 * lives server-side, in mediajel-serverless): Parcel would resolve that copy from node_modules and the chunk would end up with two of
 * them — two preact runtimes means hooks registered against one module's `options` hooks never
 * fire during the other's diff.
 *
 * Adding a symbol here costs a rebuild of the package (`turbo` orders it before the tag build);
 * forgetting to add one is a compile error at `check`, never a silent runtime hole.
 */

// Preact — the UI.
export { Fragment, h, render } from "preact";
export type { ComponentChild, ComponentChildren, VNode } from "preact";
export { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";

// The automatic-JSX-runtime surface. .tsx files never import these; the bundler emits the
// calls and an `import … from "preact/jsx-runtime"`, which BOTH package.json alias maps point
// back at this bundle. That is what keeps the chunk down to ONE preact — see the "//jsx" note
// in tsconfig.json. `jsxTemplate`/`jsxAttr`/`jsxEscape` are SWC's static-markup optimization
// and `jsxDEV` the watch-mode variant (`preact/jsx-dev-runtime` has no directory in
// node_modules at all, so a dev build without the alias fails to resolve outright).
export { jsx, jsxAttr, jsxDEV, jsxEscape, jsxs, jsxTemplate } from "preact/jsx-runtime";

// Zod — the generation schema (Task 5) and the verify payload check (Task 7).
export { z } from "zod";
