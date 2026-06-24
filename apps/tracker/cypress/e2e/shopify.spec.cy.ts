describe("shopify test", () => {
  it("tests shopify test", () => {
    cy.viewport(916, 945);

    cy.visit('https://yig0fq-hp.myshopify.com/')
  
         cy.get('.card > .card__content > .card__information > #title-template--17997459095742__featured-collection-8368789618878 > #CardLink-template--17997459095742__featured-collection-8368789618878').click()
      
         cy.visit('https://yig0fq-hp.myshopify.com/products/canna-1')
      
         cy.get('div > .product-form > #product-form-template--17997459194046__main > .product-form__buttons > #ProductSubmitButton-template--17997459194046__main').click()
      
         cy.get('.cart-notification-wrapper > #cart-notification > .cart-notification__links > #cart-notification-form > .button').click()
      
         cy.get('#email').type('test@gmail.com')
         
         cy.get('input[placeholder="First name (optional)"]')
         .click()        
         .type('test');

         cy.get('input[placeholder="Last name"]')
         .click()
         .type('test');

         cy.get('input[placeholder="Address"]')
         .click()         
         .type('Lakawan');

         cy.get('input[placeholder="City"]')
         .click()
         .type('Tayabas');

         cy.get('select[name="zone"]')
         .select('PH-QUE');

         cy.get('input[name="postalCode"][placeholder="Postal code"]')
        .type('4327');


         cy.get('input[type="radio"]#basic-paymentOnDelivery')
         .check();

         // Intercept Snowplow request
         cy.intercept('POST', '**/analytics/track').as('snowplowTransaction');

         cy.get('button#checkout-pay-button')
         .click({timeout: 10000 });

        cy.url({ timeout: 10000 }).should('include', 'thank_you');

        // Get the total price from the page
        cy.get('span.order-summary__emphasis.total-recap__final-price.skeleton-while-loading[data-checkout-payment-due-target]')
          .invoke('text')
          .then((pageTotal) => {
            // Convert the total from the page to a number for comparison
            const formattedPageTotal = parseFloat(pageTotal.replace(/[^0-9.]/g, ''));

            // Process all intercepted events until the transaction event is found
            let transactionFound = false;

            for (let i = 0; i < 2; i++) { // Adjust the loop count based on the expected number of events
              if (transactionFound) break; // Exit the loop if the transaction event is already found

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
            }
          });
  });
});