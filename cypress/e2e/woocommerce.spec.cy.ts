describe("Woocommerce", () => {
  it("tests Woocommerce add to cart and checkout flow", () => {
    cy.viewport(605, 945);
    
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

  });
});