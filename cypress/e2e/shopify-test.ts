describe("shopify test", () => {
  it("tests shopify test", () => {
    cy.viewport(916, 945);

    cy.visit('https://yig0fq-hp.myshopify.com/')
  
         cy.get('.card > .card__content > .card__information > #title-template--17997459095742__featured-collection-8368789618878 > #CardLink-template--17997459095742__featured-collection-8368789618878').click()
      
         cy.visit('https://yig0fq-hp.myshopify.com/products/canna-1')
      
         cy.get('div > .product-form > #product-form-template--17997459194046__main > .product-form__buttons > #ProductSubmitButton-template--17997459194046__main').click()
      
         cy.get('.cart-notification-wrapper > #cart-notification > .cart-notification__links > #cart-notification-form > .button').click()
      
         cy.visit('https://yig0fq-hp.myshopify.com/checkouts/cn/Z2NwLWFzaWEtc291dGhlYXN0MTowMUpITUE0QzJUQjlNUzlHVjZDR1Y5UzdXOA')
      
         cy.get('#email').type('test@gmail.com')
      
         cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField0').click()
      
         cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField0').type('test')
      
         cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField1').click()
      
         cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField1').type('test')
      
         cy.get('.\_1ip0g651 > div > .\_7ozb2u2 > span > #error-for-shipping-address1').click()
      
         cy.get('div > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #shipping-address1').click()
      
         cy.get('div > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #shipping-address1').type('Testarossa Winery')
      
         cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField6').click()
      
         cy.get('.\_1mrl40q0 > .RD23h > div > .VZudx > #Select2').click()
      
         cy.get('.\_1mrl40q0 > .RD23h > div > .VZudx > #Select2').click()
      
         cy.get('div > #shippingAddressForm > .r62YW > .\_1ip0g651 > .\_1mrl40q0:nth-child(5)').click()
      
         cy.get('.yyi4nyd > .yyi4nyi > .yyi4nyv > .\_6hzjvo2 > #basic-paymentOnDelivery').click()
      
         cy.get('.yyi4nyd > .yyi4nyi > .yyi4nyv > .\_6hzjvo2 > #basic-paymentOnDelivery').type('on')
      
         cy.get('.\_1ip0g651 > div > .\_1ip0g651 > div > #checkout-pay-button').click()
      
         cy.visit('https://yig0fq-hp.myshopify.com/checkouts/cn/c59ba313df60ef7c4e9a9f2f10356558/thank_you')
      
         cy.get('.order-summary-toggle > .wrap > .order-summary-toggle__inner > .order-summary-toggle__text--show > span').click()
      
         cy.get('.order-summary-toggle > .wrap > .order-summary-toggle__inner > .order-summary-toggle__text--hide > span').click()
  });
});