import { appErrorsFrom } from "../support/app-errors";
import { HARNESS, stubV2Harness } from "../support/harness";

describe("Error boundary — a throwing tag callback can't crash the client page", () => {
  // HARNESS is served by `npm run bootstrap-test-server` (public/index.test.html
  // loads the tag with environment=jane).

  it("suppresses a throwing data-source callback while the tag keeps working", () => {
    cy.intercept("POST", "**/analytics/track", { statusCode: 200, body: {} }).as("track");

    // Capture any uncaught exception that reaches the page, and return false so Cypress
    // doesn't auto-fail — we assert on it explicitly. With the guard() error boundary the
    // throwing jane callback below (a TypeError) is caught + logged, so this must stay null.
    let uncaught: Error | null = null;
    cy.on("uncaught:exception", (err) => {
      // The bootstrap harness uses `parcel watch`; on a cold first run a code-split chunk
      // can momentarily 404 (HTML served as JS), throwing a SyntaxError unrelated to this
      // test. Ignore those — we're asserting the jane callback's TypeError never escapes.
      if (err.name !== "SyntaxError" && !/Unexpected token/i.test(err.message)) {
        uncaught = err;
      }
      return false;
    });

    cy.visit(HARNESS);

    // The tag is alive: it fires its pageview.
    cy.wait("@track", { timeout: 20000 });

    cy.window().then((win) => {
      // (1) A message that makes jane's GUARDED postMessage callback throw:
      //     cartItemRemoval with no productId -> `productId.toString()` throws (not locally caught).
      win.postMessage(
        { messageType: "analyticsEvent", payload: { name: "cartItemRemoval", properties: {} } },
        "*",
      );
      // (2) A valid checkout proves the postMessage listener is actually active (so the throw
      //     above really happened) and that the tag survived it — it emits a transaction event.
      win.postMessage(
        {
          messageType: "analyticsEvent",
          payload: {
            name: "checkout",
            properties: {
              cartId: "EB-TEST-CART",
              estimatedTotal: "42.00",
              products: [{ product_id: "P1", name: "Test", category: "C", unit_price: "42.00", count: 1 }],
            },
          },
        },
        "*",
      );
    });

    // The valid checkout still produces a collector hit -> listener active + tag survived the throw.
    cy.wait("@track", { timeout: 20000 });

    cy.then(() => {
      expect(uncaught, "a guarded tag callback must not crash the host page").to.be.null;
    });
  });

  it("reports the suppressed throw through the funnel as guard:post-message", () => {
    const captured: any[] = [];
    cy.intercept("POST", "**/analytics/track", (req) => {
      appErrorsFrom(req.body).forEach((d) => captured.push(d));
      req.reply({ statusCode: 200, body: {} });
    }).as("track");

    // Error reporting is v2-only (the shared fixture at HARNESS loads v1, where
    // trackError is a documented no-op), so stub a v2 page. jane's guarded
    // postMessage listener works on a bare page.
    stubV2Harness("jane");

    // The suppressed TypeError below must not fail the test at the Cypress level either.
    cy.on("uncaught:exception", () => false);

    cy.visit(HARNESS);
    cy.wait("@track", { timeout: 20000 }); // SDK live (pageview flushed)

    cy.window().then((win) => {
      // Same poison message as the suppression test: jane's guarded postMessage callback
      // throws `productId.toString()` outside its local try/catch, landing in guard().
      win.postMessage(
        { messageType: "analyticsEvent", payload: { name: "cartItemRemoval", properties: {} } },
        "*",
      );
      // Valid checkout proves the listener actually processed the poison message above.
      win.postMessage(
        {
          messageType: "analyticsEvent",
          payload: {
            name: "checkout",
            properties: {
              cartId: "EB-GUARD-CART",
              estimatedTotal: "42.00",
              products: [{ product_id: "P1", name: "Test", category: "C", unit_price: "42.00", count: 1 }],
            },
          },
        },
        "*",
      );
    });
    cy.wait("@track", { timeout: 20000 });

    cy.window().then((win: any) => win.tracker("flushBuffer"));

    // guard() must report what it suppressed: one application_error attributed to the
    // guard boundary (channel label), with the real TypeError message.
    cy.wrap(null, { timeout: 15000 }).should(() => {
      const mine = captured.filter((d) => (d.message || "").startsWith("[guard:post-message]"));
      expect(mine.length, "suppressed throw reported through the funnel").to.be.greaterThan(0);
      expect(mine[0].message).to.contain("toString");
    });
  });
});
