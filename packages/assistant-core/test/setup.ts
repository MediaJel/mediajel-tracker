/**
 * Preloaded by `bun test` (see the `test` script in package.json).
 *
 * The widget is browser-only code: it reads `document`, `sessionStorage`, `CSSStyleSheet` and
 * `MutationObserver` at module scope in places. happy-dom installs those on `globalThis` before
 * any test file is imported, so the modules under test can be imported unchanged — no DOM shim
 * of our own, and no jsdom-style `@jest-environment` pragma per file.
 */
import { mock } from "bun:test";
import { setLoggingEnabled } from "@mediajel/tracker-core/logger";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// `data-url:./assets/…` is Parcel's inlining scheme, not a module bun can resolve — and a
// scheme-prefixed specifier never reaches a Bun.plugin onResolve hook either, so this is the
// one mechanism that can stand in for it. What Parcel emits is a default-exported data URI,
// which is all any test needs from the mark. Keep the specifier byte-identical to ui/icons.tsx.
mock.module("data-url:./assets/mj-mark-128.png", () => ({
  default:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
}));

// A real URL, because the widget reads `location.hostname` (the Site row, and the deploy
// target name) and about:blank has neither a host nor an origin.
GlobalRegistrator.register({ url: "https://shop.example.com/checkout" });

// The widget logs through tracker-core's logger, which defaults to ON (a tag with no `logs`
// flag in its query string is meant to talk). In a test run that is just noise on top of the
// results, so it is off here. The trade-off is that an exception swallowed by `guard` leaves no
// trace — every test below therefore asserts on an outcome, never on the absence of a log line.
setLoggingEnabled(false);
