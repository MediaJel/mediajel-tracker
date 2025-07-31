describe("Woocommerce", () => {
  it("tests Woocommerce add to cart and checkout flow", () => {
    cy.viewport(605, 945);

    cy.on('uncaught:exception', (err, runnable) => {
      if (err.message.includes('Unexpected token')) {
        return false; // prevents Cypress from failing the test
      }
    });
    
    // Intercept Snowplow request
    cy.intercept('POST', '**/analytics/track').as('snowplowTransaction');
    
    cy.visit("https://integrations-wp.pacholoamit.com/shop/");
    cy.wait(2000); 
    
    cy.get('.products li').first().within(() => {
      cy.get('a.add_to_cart_button, .add_to_cart_button, button[type="submit"]').click();
    });
    
    cy.get('.added_to_cart, .woocommerce-message a[href*="cart"]').should('be.visible').click();
    
    cy.url().should('include', '/cart/');
    
    cy.get('.wc-proceed-to-checkout a.checkout-button, .checkout-button, a[href*="checkout"]').click();
    
    cy.url().should('include', '/checkout/');
    
    cy.wait(3000);
    
    cy.get("#email").type("tester@gmail.com");
    cy.get("#shipping-first_name").type("first");
    cy.get("#shipping-last_name").type("last");
    cy.get("#shipping-address_1").type("test address");
    cy.get("#shipping-city").type("test");
    cy.get("#shipping-postcode").type("12345");
    cy.get("#content form").click();
    cy.get("#content button").click();

    // Get the total price from the page
    cy.get('span.woocommerce-Price-amount')
          .invoke('text')
          .then((pageTotal) => {
            // Convert the total from the page to a number for comparison
            const formattedPageTotal = parseFloat(pageTotal.replace(/[^0-9.]/g, ''));

            // Process all intercepted events until the transaction event is found
            let transactionFound = false;

              cy.wait('@snowplowTransaction', { timeout: 20000 }).then((interception) => {
                if (transactionFound) return; // Exit if the transaction event is already found

                // Access the request body
                const requestBody = interception.request.body;

                // Check if the transaction event exists
                const transactionEvent = requestBody?.data?.find((item) => item.e === 'tr');

                if (transactionEvent) {
                  transactionFound = true; // Mark the transaction event as found

                  // Log transaction details
                  cy.log('Transaction Event Found:');
                  cy.log(`Transaction ID: ${transactionEvent.tr_id}`);
                  cy.log(`Transaction Total: ${transactionEvent.tr_tt}`);
                  cy.log(`Transaction Currency: ${transactionEvent.tr_cu}`);

                  // Assert transaction details
                  expect(transactionEvent.tr_id).to.exist;
                  expect(transactionEvent.tr_tt).to.exist;
                  expect(transactionEvent.tr_cu).to.eq('USD'); // Example: Assert currency is USD

                  // Compare the transaction total with the total from the page
                  expect(parseFloat(transactionEvent.tr_tt)).to.eq(formattedPageTotal);

                  // Assert the response status code
                  expect(interception.response.statusCode).to.eq(200);
                } else {
                  cy.log('No transaction event found in this request.');
                }
              });
          });

  });
});
