# US Privacy Opt-Out (GPC / DNT) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MediaJel tag automatically refuse to initialize tracking for any US visitor who has signaled a privacy opt-out — on every site, with zero per-site setup.

**Architecture:** A single browser-level gate at the tag's entry point (`src/index.ts`). A pure util reads the US opt-out signals — Global Privacy Control (GPC) plus legacy Do Not Track (DNT) — straight from the browser. If opted out, the tag `return`s before loading any adapter, Snowplow tracker, custom tags, or appId tags. Because the gate lives in the shared tag, every embedding site inherits it; no consent banner, cookie, or site cooperation is involved. "Respect" means **hard no-track**: no events sent, no cookies set, no network calls.

**Tech Stack:** TypeScript, Parcel, Snowplow JS tracker, Cypress (E2E), start-server-and-test.

## Global Constraints

- **No new runtime dependencies** — `package.json` `dependencies` is empty (`{}`); keep it that way.
- **Must pass type-check:** `npm run check` (`tsc --noEmit`) with no errors.
- **Browser support:** browserslist `since 2017-06` — use widely-supported syntax (optional chaining / simple property reads are fine).
- **Follow existing patterns:** standalone helpers live in `src/shared/utils/*.ts`; global type augmentation lives in `src/shared/interface.ts` (`declare global`).
- **No behavior change when no opt-out signal is present** — a visitor with no GPC/DNT signal must be tracked exactly as today. The opt-out path is the only new behavior.
- **Opt-out is a hard return** — place the gate before `getCustomTags()` / `getAppIdTags()` so opted-out visitors generate no network activity at all.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/shared/utils/privacy-opt-out.ts` | Pure detection of US opt-out signals (GPC, DNT). One exported predicate. | Create |
| `src/shared/interface.ts` | Add `Navigator.globalPrivacyControl` / `msDoNotTrack` and `Window.doNotTrack` to the existing `declare global` block. | Modify |
| `src/index.ts` | Call the predicate right after `getContext()`; `return` early if opted out. | Modify (insert after line 13) |
| `cypress/e2e/privacy-opt-out.spec.cy.ts` | E2E proof: tag suppressed when GPC set; tag fires when not. | Create |

This is one cohesive, independently-testable deliverable, so it is a single task.

---

### Task 1: Browser-level US privacy opt-out gate

**Files:**
- Create: `src/shared/utils/privacy-opt-out.ts`
- Modify: `src/shared/interface.ts` (inside the existing `declare global { ... }` block)
- Modify: `src/index.ts:13` (insert gate immediately after `const context = getContext();`)
- Test: `cypress/e2e/privacy-opt-out.spec.cy.ts`

**Interfaces:**
- Produces: `isUsPrivacyOptOut(): boolean` (default export and named export of `src/shared/utils/privacy-opt-out.ts`). Returns `true` when `navigator.globalPrivacyControl === true`, or when `navigator.doNotTrack` / `navigator.msDoNotTrack` / `window.doNotTrack` is `"1"` or `"yes"`.
- Consumes: nothing from other tasks. Uses the browser globals `navigator` and `window`.

- [ ] **Step 1: Write the failing E2E test**

Create `cypress/e2e/privacy-opt-out.spec.cy.ts`:

```ts
describe("US privacy opt-out (GPC / DNT)", () => {
  // Served by `npm run bootstrap-test-server` (public/index.test.html loads the tag).
  const HARNESS = "http://localhost:1234/";

  beforeEach(() => {
    // Stub the collector so tests never hit a real endpoint; we only care whether
    // the tag *attempts* to send.
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} }).as("track");
    // The tag may throw on cross-origin SDK quirks; don't let that fail the assertion.
    cy.on("uncaught:exception", () => false);
  });

  it("suppresses the tag when Global Privacy Control is enabled", () => {
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "globalPrivacyControl", {
          value: true,
          configurable: true,
        });
      },
    });

    // Give the async tag time to load and (in the un-gated build) fire a pageview.
    cy.wait(3000);

    // With the gate in place, nothing should have been sent to the collector.
    cy.get("@track.all").should("have.length", 0);
  });

  it("loads the tag normally when no opt-out signal is present", () => {
    cy.visit(HARNESS);

    // Positive control: the tag fires at least one collector request (e.g. pageview).
    cy.wait("@track", { timeout: 20000 });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npx start-server-and-test 'npm run bootstrap-test-server' http://localhost:1234 'npx cypress run --spec cypress/e2e/privacy-opt-out.spec.cy.ts'
```

Expected: the **"suppresses the tag when Global Privacy Control is enabled"** test FAILS — assertion `expected '@track.all' to have length 0` but it has length ≥ 1 (the un-gated tag still sends a pageview). The **"loads the tag normally"** test PASSES.

- [ ] **Step 3: Add the global type augmentation**

In `src/shared/interface.ts`, inside the existing `declare global { ... }` block, add a `Navigator` interface and one field to `Window`:

```ts
declare global {
  interface Navigator {
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string | null;
  }
  interface Window {
    doNotTrack?: string | null;
    // ...existing fields stay unchanged...
  }
}
```

(Leave every existing `Window` field exactly as-is; only add the `doNotTrack` line and the new `Navigator` interface.)

- [ ] **Step 4: Create the detection util**

Create `src/shared/utils/privacy-opt-out.ts`:

```ts
/**
 * Detects US privacy opt-out signals at the browser level.
 *
 * Honors Global Privacy Control (GPC) — the opt-out signal legally recognized
 * under California's CCPA/CPRA and in Colorado and Connecticut — plus legacy
 * Do Not Track (DNT) as a fallback. Read directly from the browser; no consent
 * banner, cookie, or per-site integration is involved.
 *
 * @returns true if the visitor has signaled a privacy opt-out.
 */
export const isUsPrivacyOptOut = (): boolean => {
  const gpcOptOut = navigator.globalPrivacyControl === true;

  const dntRaw = navigator.doNotTrack || navigator.msDoNotTrack || window.doNotTrack;
  const dntOptOut = dntRaw === "1" || dntRaw === "yes";

  return gpcOptOut || dntOptOut;
};

export default isUsPrivacyOptOut;
```

- [ ] **Step 5: Wire the gate into the tag entry point**

In `src/index.ts`, add the import alongside the existing util imports (after line 9):

```ts
import isUsPrivacyOptOut from "./shared/utils/privacy-opt-out";
```

Then insert the gate immediately after `const context: QueryStringContext = getContext();` (currently line 13), **before** `await getCustomTags();`:

```ts
    const context: QueryStringContext = getContext();

    // US privacy opt-out gate — honor GPC / DNT before any tracking or network activity.
    // Lives in the tag so every embedding site inherits it. Hard no-track: we return before
    // loading adapters, Snowplow, custom tags, or appId tags — no events, no cookies.
    if (isUsPrivacyOptOut()) {
      logger.debug("US privacy opt-out detected (GPC/DNT). Tracker will not initialize.");
      return;
    }

    await getCustomTags();
    await getAppIdTags(context.appId);
```

- [ ] **Step 6: Run the test and type-check; confirm both pass**

Run:

```bash
npm run check
npx start-server-and-test 'npm run bootstrap-test-server' http://localhost:1234 'npx cypress run --spec cypress/e2e/privacy-opt-out.spec.cy.ts'
```

Expected: `npm run check` exits 0 (no type errors). Both Cypress tests PASS — the GPC visitor sends nothing (`@track.all` length 0); the normal visitor fires `@track`.

- [ ] **Step 7: Commit**

```bash
git add src/shared/utils/privacy-opt-out.ts src/shared/interface.ts src/index.ts cypress/e2e/privacy-opt-out.spec.cy.ts
git commit -m "feat: honor US privacy opt-out (GPC/DNT) in the tag before initializing tracking"
```

---

## Manual Verification (real signal, optional)

Automated coverage above is sufficient, but to see it with a real browser signal:

1. `npm start` (serves the tag on `:3000`, demo on `:1234`).
2. Open the demo in a browser with GPC on — **Brave** (GPC on by default), **Firefox** (`Settings → Privacy & Security → "Tell websites not to sell or share my data"`), or a GPC extension.
3. DevTools → Network, filter `track`: **no** `POST …/analytics/track` requests appear, and the console shows `US privacy opt-out detected (GPC/DNT). Tracker will not initialize.`
4. Turn GPC off, reload: collector requests return.

## Out of Scope (deferred, same gate later)

- **Site CMP signals** — US Privacy string (`__uspapi`) and GPP (`__gpp`) for opt-outs made through a site's own consent tool. Adds async querying; slots behind the same gate.
- **Opt-out audit/recording** — currently the opt-out is silently honored; no event is recorded that a visitor opted out.
- **Per-appId escape hatch** — the gate is global and unconditional in v1.

## Notes

- The existing `respectDoNotTrack: true` change (uncommitted in the working tree) becomes defense-in-depth for DNT once this ships, since this gate stops initialization earlier. It is independent of this plan; leave it as-is.
- `dist/` is a build artifact dir; do not hand-edit. `npm start` / `bootstrap-test-server` rebuild it.
