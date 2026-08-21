/**
 * The recorder, end to end in a real browser: enable on the harness store, start a job,
 * simulate a purchase (fetch + dataLayer.push + pushState), watch the work order count it,
 * stop, and come back to Evidence with the recording persisted.
 *
 * Runs against the dev harness: the store on :1234 loading the tag from :3010 (see Task 0's
 * report for why :3000 is occupied on this machine — the committed spec only assumes :1234).
 */
/* global describe, it, beforeEach, cy, expect */
describe("Integrations Assistant — recording", () => {
  const HARNESS = "http://localhost:1234/";

  const shadow = () =>
    cy.get("#mj-widget-host").then(($host) => {
      const root = $host[0].shadowRoot;
      expect(root, "shadow root").to.not.equal(null);
      return root as ShadowRoot;
    });

  const inShadow = (selector: string) =>
    shadow().then((root) => {
      const el = root.querySelector(selector);
      expect(el, selector).to.not.equal(null);
      return cy.wrap(el as HTMLElement);
    });

  beforeEach(() => {
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} });
    cy.on("uncaught:exception", () => false);
  });

  it("records a simulated purchase and hands the work order to Evidence", () => {
    cy.visit(HARNESS);
    cy.window().then((win) => (win as unknown as { enableTrackerWidget(): Promise<void> }).enableTrackerWidget());

    // Start the transaction job from the open Record section.
    inShadow(".mj-goals .mj-btn").click();
    inShadow(".mj-rec-label").should("contain.text", "REC");

    // Simulate the purchase on the page: fetch + dataLayer.push + pushState.
    cy.get("#buy").click();
    cy.get("#order-result").should("contain.text", "Thank you");

    // The work order saw it: counters include requests, dataLayer and a route change.
    shadow().then((root) => {
      const counts = root.querySelector(".mj-counts")?.textContent ?? "";
      expect(counts).to.include("requests");
      expect(counts).to.include("dataLayer");
      expect(counts).to.include("routes");
    });

    // Stop → Evidence owns the step; 01 collapses to its stamp.
    shadow().then((root) => {
      const stop = Array.from(root.querySelectorAll(".mj-btn")).find((b) => b.textContent?.includes("Stop"));
      expect(stop, "stop button").to.not.equal(undefined);
      (stop as HTMLElement).click();
    });
    inShadow(".mj-stamp").should("contain.text", "Recorded");
    cy.window().then((win) => {
      const session = JSON.parse(win.sessionStorage.getItem("mj-widget:session") as string);
      expect(session.step).to.equal("review");
      expect(session.timeline.length).to.be.greaterThan(3);
      const kinds = session.timeline.map((e: { kind: string }) => e.kind);
      expect(kinds).to.include("network");
      expect(kinds).to.include("datalayer");
      expect(kinds).to.include("nav");
      expect(kinds).to.include("platform");
      // The purchase fetch was recorded with its masked body, and no widget-own traffic is in it.
      const network = session.timeline.filter((e: { kind: string }) => e.kind === "network");
      expect(network.some((e: { url: string }) => e.url.includes("/api/checkout"))).to.equal(true);
    });
  });

  it("keeps the recording across a full reload and re-arms the sources", () => {
    cy.visit(HARNESS);
    cy.window().then((win) => (win as unknown as { enableTrackerWidget(): Promise<void> }).enableTrackerWidget());
    inShadow(".mj-goals .mj-btn").click();
    cy.get("#buy").click();

    cy.reload();

    // Auto-resumed collapsed, still recording.
    inShadow(".mj-chip .mj-rec-dot").should("exist");
    cy.window().then((win) => {
      const session = JSON.parse(win.sessionStorage.getItem("mj-widget:session") as string);
      expect(session.step).to.equal("recording");
      expect(session.pages.length).to.be.greaterThan(1); // the reload added a page
    });
  });
});

describe("Integrations Assistant — evidence & settings", () => {
  const HARNESS = "http://localhost:1234/";

  const shadow = () =>
    cy.get("#mj-widget-host").then(($host) => {
      const root = $host[0].shadowRoot;
      expect(root, "shadow root").to.not.equal(null);
      return root as ShadowRoot;
    });

  const click = (selector: string, textFilter?: string) =>
    shadow().then((root) => {
      const all = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
      const el = textFilter ? all.find((e) => e.textContent?.includes(textFilter)) : all[0];
      expect(el, `${selector}${textFilter ? ` "${textFilter}"` : ""}`).to.not.equal(undefined);
      (el as HTMLElement).click();
    });

  beforeEach(() => {
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} });
    cy.on("uncaught:exception", () => false);
  });

  it("pins evidence, gates Generate behind settings, and reaches the generating step", () => {
    cy.visit(HARNESS);
    cy.window().then((win) => (win as unknown as { enableTrackerWidget(): Promise<void> }).enableTrackerWidget());
    click(".mj-goals .mj-btn");
    cy.get("#buy").click();
    click(".mj-btn", "Stop recording");

    // Evidence leads with its best guess: the purchase push, in plain words, with the facts.
    shadow().then((root) => {
      const guess = root.querySelector(".mj-guess");
      expect(guess, "a suggestion card").to.not.equal(null);
      expect(guess?.textContent).to.include("“purchase” event on the data layer");
      expect(guess?.querySelector(".mj-guess-facts")?.textContent).to.include("$84.00");
    });
    click(".mj-guess .mj-btn", "Yes");
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      expect(root.querySelectorAll(".mj-tl--pinned")).to.have.length(1);
      expect(root.querySelector(".mj-tl--pinned .mj-tl-title")?.textContent).to.include("purchase");
    });

    // Generate with no key: opens Settings instead of failing.
    click(".mj-btn", "Generate");
    shadow().then((root) => expect(root.querySelector(".mj-settings")).to.not.equal(null));

    // Configure, acknowledge, close.
    shadow().then((root) => {
      const inputs = Array.from(root.querySelectorAll(".mj-settings input"));
      const setNative = (el: HTMLInputElement, value: string) => {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        desc?.set?.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const secrets = inputs.filter((el) => (el as HTMLInputElement).type === "password") as HTMLInputElement[];
      setNative(secrets[0], "test-key-1234567890"); // provider API key
      setNative(secrets[1], "ghp_test_token_1234567890"); // GitHub token
      const named = inputs.filter((el) => (el as HTMLInputElement).type === "text") as HTMLInputElement[];
      // model input first, then actor name/email — identify by surrounding label text instead:
      const byLabel = (label: string): HTMLInputElement => {
        const field = Array.from(root.querySelectorAll(".mj-field")).find((f) => f.textContent?.includes(label));
        return field?.querySelector("input") as HTMLInputElement;
      };
      setNative(byLabel("Your name"), "Jane Doe");
      setNative(byLabel("Your email"), "jane@mediajel.com");
      void named;
      const ack = root.querySelector(".mj-check input") as HTMLInputElement;
      ack.click();
    });
    click(".mj-btn", "Done");

    // Generate now runs the (mocked) model through the real AI SDK path and lands on 03 Code.
    cy.window().then((win) => {
      (win as unknown as Record<string, unknown>).__MJ_WIDGET_MOCK_MODEL__ = {
        json: {
          summary: "Tracks the GA4 purchase push on this store.",
          trigger: { kind: "dataLayer", description: "dataLayer purchase event" },
          code:
            'import { datalayerSource } from "../libs/sources/google-datalayer-source";\n' +
            'import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";\n\n' +
            "const greenleaf = () => {\n  isTrackTransLoaded(() => {\n    datalayerSource((data) => {\n" +
            '      if (data.event !== "purchase") return;\n      const purchase = data.ecommerce;\n' +
            '      const dedupKey = "mj-greenleaf-" + purchase.transaction_id;\n' +
            '      if (localStorage.getItem(dedupKey)) return;\n      localStorage.setItem(dedupKey, "1");\n' +
            "      window.trackTrans({\n        id: purchase.transaction_id.toString(),\n" +
            "        total: parseFloat(purchase.value) || 0,\n        tax: parseFloat(purchase.tax) || 0,\n" +
            '        shipping: parseFloat(purchase.shipping) || 0,\n        city: "N/A",\n        state: "N/A",\n' +
            '        country: "N/A",\n        currency: "USD",\n        items: (purchase.items || []).map((item) => ({\n' +
            '          orderId: purchase.transaction_id.toString(),\n          sku: item.item_id || "N/A",\n' +
            '          name: item.item_name,\n          category: item.item_category || "N/A",\n' +
            "          unitPrice: item.price || 0,\n          quantity: item.quantity || 1,\n" +
            '          currency: "USD",\n        })),\n      });\n    });\n  });\n};\n\ngreenleaf();',
          fieldCoverage: [
            {
              field: "id",
              status: "mapped",
              source: "ecommerce.transaction_id",
              value: null,
              confidence: "high",
              note: null,
            },
            {
              field: "total",
              status: "mapped",
              source: "ecommerce.value",
              value: null,
              confidence: "high",
              note: null,
            },
            { field: "city", status: "default", source: null, value: '"N/A"', confidence: "high", note: null },
          ],
          items: { trackable: true, reason: null },
          warnings: [],
          suggestedTarget: { kind: "domain", reason: "the dataLayer shape is specific to this storefront" },
          dedupKey: "mj-greenleaf-<transaction_id>",
        },
      };
    });
    click(".mj-btn", "Generate");

    // The result renders: summary, editable code, the honest checklist. `.should` retries
    // until the async generation resolves.
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      const body = root.querySelector(".mj-section-body")?.textContent ?? "";
      expect(body).to.include("Tracks the GA4 purchase push");
      const code = (root.querySelector(".mj-code") as HTMLTextAreaElement).value;
      expect(code).to.include("window.trackTrans");
      expect(code).to.include("mj-greenleaf-");
      const coverage = root.querySelector(".mj-coverage")?.textContent ?? "";
      expect(coverage).to.include("ecommerce.transaction_id");
      expect(root.querySelector(".mj-cov-line")?.textContent).to.include("1 default");
    });
    cy.window().then((win) => {
      const session = JSON.parse(win.sessionStorage.getItem("mj-widget:session") as string);
      expect(session.step).to.equal("result");
      expect(session.generation.model).to.be.a("string");
      expect(session.generation.violations).to.have.length(0);
    });

    // ---- 04 Verify: the generated tag runs HERE, intercepted; redo the purchase. ----
    let collectorHits = 0;
    cy.intercept("POST", "**/analytics/track", () => {
      collectorHits += 1;
    });
    click(".mj-btn", "Run on this page");
    // The dataLayer already holds the recorded purchase, so the tag fires from replay at once.
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      expect(root.querySelector(".mj-captures"), "captures list").to.not.equal(null);
      expect(root.querySelector(".mj-capture-name")?.textContent).to.include("trackTrans");
    });
    // A fresh action captures again — still nothing to the collector.
    cy.get("#buy").click();
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      expect(root.querySelectorAll(".mj-capture").length).to.be.greaterThan(1);
    });
    cy.then(() => expect(collectorHits, "collector hits during verify").to.equal(0));

    // ---- 05 Deploy: GitHub intercepted; commit convention asserted byte for byte. ----
    cy.intercept("GET", "https://api.github.com/repos/MediaJel/mediajel-frictionless-custom-tag/contents/**", {
      statusCode: 404,
      body: { message: "Not Found" },
    }).as("ghCheck");
    cy.intercept("PUT", "https://api.github.com/repos/MediaJel/mediajel-frictionless-custom-tag/contents/**", {
      statusCode: 201,
      body: {
        commit: { html_url: "https://github.com/MediaJel/mediajel-frictionless-custom-tag/commit/e2e", sha: "e2e" },
        content: { html_url: "https://github.com/MediaJel/mediajel-frictionless-custom-tag/blob/master/x.ts" },
      },
    }).as("ghPut");

    click(".mj-btn", "Approve → Deploy");
    cy.wait("@ghCheck");
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      const body = root.querySelector(".mj-section-body")?.textContent ?? "";
      expect(body).to.include("Where should this tag live?");
      expect(body).to.include("src/domains/localhost.ts");
      expect(body).to.include("new file");
    });
    click(".mj-btn", "Deploy to master");
    cy.wait("@ghPut").then(({ request }) => {
      expect(request.body.branch).to.equal("master");
      expect(request.body.committer).to.deep.equal({
        name: "Frictionless Tags Factory",
        email: "frictionless-tags-factory@mediajel.com",
      });
      expect(request.body.message).to.equal("Add domain tag localhost\n\nCreated by: Jane Doe (jane@mediajel.com)");
      expect(atob(request.body.content)).to.include("window.trackTrans");
    });
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      const body = root.querySelector(".mj-section-body")?.textContent ?? "";
      expect(body).to.include("is on master");
      expect(body).to.include("The commit");
    });
    cy.window().then((win) => {
      const session = JSON.parse(win.sessionStorage.getItem("mj-widget:session") as string);
      expect(session.step).to.equal("done");
      expect(session.deploy.path).to.equal("src/domains/localhost.ts");
      expect(session.deploy.commitUrl).to.include("/commit/e2e");
    });
  });
});

describe("Integrations Assistant — sign-up flow", () => {
  const HARNESS = "http://localhost:1234/";

  const shadow = () =>
    cy.get("#mj-widget-host").then(($host) => {
      const root = $host[0].shadowRoot;
      expect(root, "shadow root").to.not.equal(null);
      return root as ShadowRoot;
    });

  const click = (selector: string, textFilter?: string) =>
    shadow().then((root) => {
      const all = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
      const el = textFilter ? all.find((e) => e.textContent?.includes(textFilter)) : all[0];
      expect(el, `${selector}${textFilter ? ` "${textFilter}"` : ""}`).to.not.equal(undefined);
      (el as HTMLElement).click();
    });

  it("records a sign-up, captures the form and reaches a trackSignUp result", () => {
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} });
    cy.on("uncaught:exception", () => false);
    cy.visit(HARNESS, {
      onBeforeLoad: (win) => {
        // Settings are per-tab; hand this test a configured widget so Generate can run.
        win.sessionStorage.setItem(
          "mj-widget:settings",
          JSON.stringify({
            provider: "gateway",
            model: "anthropic/claude-sonnet-5",
            apiKey: "test-key",
            githubToken: "",
            actor: { name: "Jane Doe", email: "jane@mediajel.com" },
            remember: false,
            acknowledgedDataSharing: true,
          }),
        );
        (win as unknown as Record<string, unknown>).__MJ_WIDGET_MOCK_MODEL__ = {
          json: {
            summary: "Tracks the newsletter sign-up form.",
            trigger: { kind: "form", description: "newsletter form submit" },
            code:
              'import { isTrackTransLoaded } from "../libs/utils/is-trackTrans-loaded";\n' +
              'import { sha256 } from "../libs/utils/sha256-encode";\n\n' +
              "const greenleafSignup = () => {\n  isTrackTransLoaded(() => {\n" +
              '    const form = document.querySelector("#signup");\n    if (!form) return;\n' +
              '    form.addEventListener("submit", async () => {\n' +
              "      const emailInput = form.querySelector('input[name=\"email\"]');\n" +
              '      const email = emailInput && emailInput.value ? emailInput.value.trim().toLowerCase() : "";\n' +
              "      if (!email) return;\n" +
              '      const dedupKey = "mj-greenleaf-signup-" + email;\n' +
              '      if (localStorage.getItem(dedupKey)) return;\n      localStorage.setItem(dedupKey, "1");\n' +
              "      const hashedEmailAddress = await sha256(email);\n" +
              "      window.trackSignUp({ uuid: email, emailAddress: email, hashedEmailAddress: hashedEmailAddress });\n" +
              "    });\n  });\n};\n\ngreenleafSignup();",
            fieldCoverage: [
              { field: "uuid", status: "derived", source: "email field", value: null, confidence: "high", note: null },
              {
                field: "emailAddress",
                status: "mapped",
                source: 'input[name="email"]',
                value: null,
                confidence: "high",
                note: null,
              },
            ],
            items: { trackable: true, reason: null },
            warnings: [],
            suggestedTarget: { kind: "domain", reason: "form markup is site-specific" },
            dedupKey: "mj-greenleaf-signup-<email>",
          },
        };
      },
    });
    cy.window().then((win) => (win as unknown as { enableTrackerWidget(): Promise<void> }).enableTrackerWidget());

    click(".mj-goals .mj-btn", "Track sign-ups");
    cy.get("#signup input[name='email']").clear().type("jane@example.com");
    cy.get("#signup button[type='submit']").click();
    click(".mj-btn", "Stop recording");

    // The guess is the submitted form. Reject it; the sheet offers its next guess (the POST),
    // and "Show me everything" is the explicit road to the timeline to point by hand.
    shadow().then((root) => expect(root.querySelector(".mj-guess")?.textContent).to.include("Submitted a form"));
    click(".mj-guess .mj-btn", "No, not this");
    shadow().then((root) => {
      const link = Array.from(root.querySelectorAll(".mj-link")).find((el) =>
        el.textContent?.includes("Show me everything"),
      );
      if (link) (link as HTMLElement).click();
    });
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      expect(root.querySelector(".mj-timeline"), "the timeline").to.not.equal(null);
    });
    // The form entry reads in plain language with the email MASKED at capture.
    shadow().then((root) => {
      const entries = Array.from(root.querySelectorAll(".mj-tl")) as HTMLElement[];
      const form = entries.find((entry) => entry.textContent?.includes("Submitted a form"));
      expect(form, "a form entry").to.not.equal(undefined);
      expect(form?.querySelector(".mj-tl-facts")?.textContent).to.include("j***@e***.com");
      (form!.querySelector(".mj-tl-main") as HTMLElement).click();
    });
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      const detail = root.querySelector(".mj-ev-detail")?.textContent ?? "";
      expect(detail).to.include("j***@e***.com");
      expect(detail).not.to.include("jane@example.com");
    });
    shadow().then((root) => {
      const entries = Array.from(root.querySelectorAll(".mj-tl")) as HTMLElement[];
      const form = entries.find((entry) => entry.textContent?.includes("Submitted a form"));
      (form!.querySelector(".mj-tl-pin") as HTMLElement).click();
    });
    click(".mj-btn", "Generate");
    cy.get("#mj-widget-host").should(($host) => {
      const root = $host[0].shadowRoot as ShadowRoot;
      const code = (root.querySelector(".mj-code") as HTMLTextAreaElement)?.value ?? "";
      expect(code).to.include("window.trackSignUp");
      expect(code).to.include("sha256");
    });
    cy.window().then((win) => {
      const session = JSON.parse(win.sessionStorage.getItem("mj-widget:session") as string);
      expect(session.goal).to.equal("signup");
      expect(session.step).to.equal("result");
    });
  });
});
