describe("Error boundary — a throwing tag callback can't crash the client page", () => {
  // Served by `npm run bootstrap-test-server` (public/index.test.html loads the tag with environment=jane).
  const HARNESS = "http://localhost:1234/";

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
});
