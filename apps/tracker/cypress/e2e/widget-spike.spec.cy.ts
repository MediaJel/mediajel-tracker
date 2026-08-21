/**
 * Runtime proof for the Integrations Assistant's lazy chunk.
 *
 * The failure this guards against does not show up in a build: Parcel can emit a perfectly
 * valid `widget.<hash>.js` whose `import()` still resolves to `undefined` in the browser when a
 * module ends up registered under one id and looked up under another (see the `alias` notes in
 * apps/tracker/package.json). So the assertions here are deliberately about live values —
 * the chunk is requested over the network, the SDK entry points are functions, a real
 * generateText round trip returns a parsed object — not just about the DOM.
 *
 * Serving matches production: the tag is loaded from :3000 (`bun run server/index.ts` over
 * `dist/`) by a page on :1234 (Parcel serving `public/index.test.html`), so the chunk URL has to
 * be resolved against the tag's origin rather than the page's.
 */
describe("Integrations Assistant widget (build spike)", () => {
  const HARNESS = "http://localhost:1234/";
  const ACTIVE_KEY = "mj-widget:active";

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

  it("loads the lazy chunk on demand and mounts a live widget", () => {
    cy.visit(HARNESS);

    cy.window()
      .then((win) => win.enableTrackerWidget())
      .then(() => {
        cy.get("@widgetChunk.all").should("have.length", 1);

        cy.get("#mj-widget-host")
          .should("exist")
          // Every AI SDK entry point survived bundling as a callable function.
          .and("have.attr", "data-providers", "gateway,openai,anthropic,google")
          // generateText + Output.object + the zod schema really ran in the browser.
          .and("have.attr", "data-output", '{"ok":true}');

        cy.get("#mj-widget-host").then(($host) => {
          const shadow = $host[0].shadowRoot;
          expect(shadow, "shadow root").to.not.be.null;
          expect(shadow?.querySelector(".mj-widget-spike")?.textContent, "preact render").to.eq("spike");
          // The stylesheet travelled inside the chunk rather than as a <link>.
          expect(shadow?.querySelector("style")?.textContent, "shadow stylesheet").to.contain(".mj-widget-spike");
        });

        cy.window().its("sessionStorage").invoke("getItem", ACTIVE_KEY).should("eq", "1");
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
    cy.get("#mj-widget-host").should("exist").and("have.attr", "data-output", '{"ok":true}');
  });

  it("unmounts and clears the tab flag on disable", () => {
    cy.visit(HARNESS);

    cy.window()
      .then((win) => win.enableTrackerWidget().then(() => win.disableTrackerWidget()))
      .then(() => {
        cy.get("#mj-widget-host").should("not.exist");
        cy.window().its("sessionStorage").invoke("getItem", ACTIVE_KEY).should("be.null");
      });
  });
});
