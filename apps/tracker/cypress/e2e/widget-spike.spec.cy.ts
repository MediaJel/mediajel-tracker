/**
 * Runtime proof for the Integrations Assistant's lazy chunk and its shell.
 *
 * The failure this guards against does not show up in a build: Parcel can emit a perfectly
 * valid `widget.<hash>.js` whose `import()` still resolves to `undefined` in the browser when a
 * module ends up registered under one id and looked up under another (see the `alias` notes in
 * apps/tracker/package.json). The same class of failure applies to preact — the JSX runtime and
 * the vendor bundle have to resolve to the SAME module or nothing renders — so the assertions
 * here are about live values and rendered output, not about the DOM the tag emits on its own.
 *
 * Serving matches production: the tag is loaded from :3000 (`bun run server/index.ts` over
 * `dist/`) by a page on :1234 (Parcel serving `public/index.test.html`), so the chunk URL has to
 * be resolved against the tag's origin rather than the page's.
 *
 * The shared eslint config declares no Cypress globals (every spec in this directory trips
 * `no-undef` on them); declaring them here keeps this file clean without touching a config the
 * other four specs share.
 */
/* global describe, it, beforeEach, cy, expect */
describe("Integrations Assistant widget", () => {
  const HARNESS = "http://localhost:1234/";
  const ACTIVE_KEY = "mj-widget:active";
  const SESSION_KEY = "mj-widget:session";

  /** The widget lives in a shadow root, which Cypress' own selectors do not cross. */
  const shadow = () =>
    cy.get("#mj-widget-host").then(($host) => {
      const root = $host[0].shadowRoot;
      expect(root, "shadow root").to.not.equal(null);
      return root as ShadowRoot;
    });

  beforeEach(() => {
    // Stub the collector: this spec is about the widget, not about tracking.
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} });
    // The tag may throw on cross-origin SDK quirks; don't let that fail the assertions.
    cy.on("uncaught:exception", () => false);
    cy.intercept("GET", "**/widget.*.js").as("widgetChunk");
  });

  it("installs the stub without downloading the widget", () => {
    cy.visit(HARNESS);

    cy.window().should((win) => {
      expect(win.enableTrackerWidget, "window.enableTrackerWidget").to.be.a("function");
      expect(win.disableTrackerWidget, "window.disableTrackerWidget").to.be.a("function");
    });

    // Nothing mounted and nothing fetched until someone asks for it.
    cy.get("#mj-widget-host").should("not.exist");
    cy.get("@widgetChunk.all").should("have.length", 0);
  });

  it("loads the lazy chunk on demand and renders the work order", () => {
    cy.visit(HARNESS);

    cy.window()
      .then((win) => win.enableTrackerWidget())
      .then(() => {
        cy.get("@widgetChunk.all").should("have.length", 1);

        cy.get("#mj-widget-host")
          .should("exist")
          // The containment invariants, inline where no page stylesheet can reach them.
          .and("have.attr", "style")
          .and("contain", "all: initial")
          .and("contain", "z-index: 2147483647");

        shadow().then((root) => {
          // preact really rendered: the JSX runtime and the vendor bundle are one module.
          expect(root.querySelector(".mj-doc-title")?.textContent, "letterhead").to.eq("Integration Work Order");
          expect(
            Array.from(root.querySelectorAll(".mj-section-label")).map((n) => n.textContent),
            "sections",
          ).to.deep.eq(["Record", "Evidence", "Code", "Verify", "Deploy"]);
          // The mark travelled inside the chunk as a data URI rather than as a request.
          expect(root.querySelector(".mj-mark")?.getAttribute("src"), "mark").to.match(/^data:image\/png;base64,/);
          // The stylesheet travelled inside the chunk too, adopted rather than <link>ed.
          const css = root.adoptedStyleSheets?.length
            ? Array.from(root.adoptedStyleSheets[0].cssRules)
                .map((rule) => rule.cssText)
                .join("")
            : (root.querySelector("style")?.textContent ?? "");
          expect(css, "shadow stylesheet").to.contain("--mj-identity");
        });

        cy.window().its("sessionStorage").invoke("getItem", ACTIVE_KEY).should("eq", "1");
      });
  });

  it("mounts collapsed as a chip when asked", () => {
    cy.visit(HARNESS);

    cy.window()
      .then((win) => win.enableTrackerWidget({ open: false }))
      .then(() => {
        shadow().then((root) => {
          expect(root.querySelector(".mj-card"), "card").to.equal(null);
          expect(root.querySelector(".mj-chip-label")?.textContent, "chip").to.eq("Work order");
        });
      });
  });

  it("auto-resumes after a reload when the tab was already running it", () => {
    cy.visit(HARNESS, {
      onBeforeLoad(win) {
        // Set before the tag executes: this is the state a navigation leaves behind.
        win.sessionStorage.setItem(ACTIVE_KEY, "1");
      },
    });

    cy.wait("@widgetChunk");
    // A resume comes back collapsed so it never covers the page being driven.
    shadow().then((root) => {
      expect(root.querySelector(".mj-chip"), "chip").to.not.equal(null);
      expect(root.querySelector(".mj-card"), "card").to.equal(null);
    });
  });

  it("names the cause and still rejects when the chunk never arrives", () => {
    cy.visit(HARNESS);
    // A half-finished CDN deploy, a CSP that blocks the script, an offline laptop.
    cy.intercept("GET", "**/widget.*.js", { statusCode: 404, body: "" });

    cy.window().then((win) => {
      const logged = cy.stub(win.console, "log").as("consoleLog");

      return win.enableTrackerWidget().then(
        () => {
          throw new Error("enableTrackerWidget resolved even though the chunk 404'd");
        },
        () => {
          // The caller still sees the failure, and the console names it as ours rather than
          // leaving the browser's opaque "Failed to fetch dynamically imported module".
          expect(
            logged.getCalls().some((call) => String(call.args[0]).includes("Integrations Assistant failed")),
            "logged cause",
          ).to.equal(true);
        },
      );
    });
  });

  it("unmounts, clears the tab flag and throws the recording away on disable", () => {
    cy.visit(HARNESS);

    cy.window()
      .then((win) => win.enableTrackerWidget().then(() => win.disableTrackerWidget()))
      .then(() => {
        cy.get("#mj-widget-host").should("not.exist");
        cy.window().its("sessionStorage").invoke("getItem", ACTIVE_KEY).should("be.null");
        cy.window().its("sessionStorage").invoke("getItem", SESSION_KEY).should("be.null");
      });
  });
});
