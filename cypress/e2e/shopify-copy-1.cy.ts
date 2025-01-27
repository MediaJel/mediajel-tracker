describe("shopify test", () => {
  it("tests shopify test", () => {
    cy.viewport(916, 945);
    // cy.visit('https://yig0fq-hp.myshopify.com/');
    // cy.get('#CardLink-template--17997459095742__featured-collection-8368789749950').click();
    // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/products/canna-2');
    // // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/wpm@ac78c151w8bf023f7pfbfb601fmf9d3fb59/custom/web-pixel-50790590@12/sandbox/modern/products/canna-2');
    // // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/wpm@ac78c151w8bf023f7pfbfb601fmf9d3fb59/custom/web-pixel-shopify-custom-pixel@0220/sandbox/modern/products/canna-2');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/12345');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/11111111');
    // cy.get('#ProductSubmitButton-template--17997459194046__main').click();
    // cy.get('#product-form-template--17997459194046__main').submit();
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/12345');
    // cy.get('.button--primary').click();
    // // cy.get('#cart-notification-form').submit();
    // // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/checkouts/cn/Z2NwLWFzaWEtc291dGhlYXN0MTowMUpITTc5U0JKTUYyQkgyR1hCNDZaMjVNMQ');
    // // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/wpm@ac78c151w8bf023f7pfbfb601fmf9d3fb59/custom/web-pixel-50790590@12/sandbox/modern/checkouts/cn/Z2NwLWFzaWEtc291dGhlYXN0MTowMUpITTc5U0JKTUYyQkgyR1hCNDZaMjVNMQ');
    // // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/wpm@ac78c151w8bf023f7pfbfb601fmf9d3fb59/custom/web-pixel-shopify-custom-pixel@0231/sandbox/modern/checkouts/cn/Z2NwLWFzaWEtc291dGhlYXN0MTowMUpITTc5U0JKTUYyQkgyR1hCNDZaMjVNMQ');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/12345');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/11111111');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/12345');
    // cy.get('#email').type('test@gmail.com');
    // cy.get('#TextField0').type('test');
    // cy.get('#TextField1').type('test');
    // cy.get('#shipping-address1').type('Testarossa Winery');
    // cy.get('#TextField6').type('Los Gatos');
    // cy.get('#Select2').click();
    // cy.get('#Select2').type('CA');
    // cy.get('#TextField7').type('95033');
    // cy.get('#basic-paymentOnDelivery').click();
    // cy.get('#checkout-pay-button').click();
    // cy.get('#Form0').submit();
    // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/checkouts/cn/4ebcdc8c58c53de1474b1c31a01b80c0/thank_you');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/12345');
    // cy.url().should('contains', 'https://www.googletagmanager.com/static/service_worker/5190/sw_iframe.html');
    // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/68380524734/digital_wallets/dialog');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/11111111');
    // // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/wpm@ac78c151w8bf023f7pfbfb601fmf9d3fb59/custom/web-pixel-shopify-custom-pixel@0231/sandbox/modern/checkouts/cn/4ebcdc8c58c53de1474b1c31a01b80c0/thank_you');
    // // cy.url().should('contains', 'https://yig0fq-hp.myshopify.com/wpm@ac78c151w8bf023f7pfbfb601fmf9d3fb59/custom/web-pixel-50790590@12/sandbox/modern/checkouts/cn/4ebcdc8c58c53de1474b1c31a01b80c0/thank_you');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/12345');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/11111111');
    // // cy.url().should('contains', 'https://td.doubleclick.net/td/rul/12345');
    // cy.get('.step__sections').click();
    // cy.get('.order-summary-toggle__text--show > span').click();

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


// describe('test_name', function() {

//   it('what_it_does', function() {
 
//      cy.viewport(933, 945)
  
//      cy.visit('https://yig0fq-hp.myshopify.com/')
  
//      cy.get('.card > .card__content > .card__information > #title-template--17997459095742__featured-collection-8368789618878 > #CardLink-template--17997459095742__featured-collection-8368789618878').click()
  
//      cy.visit('https://yig0fq-hp.myshopify.com/products/canna-1')
  
//      cy.get('div > .product-form > #product-form-template--17997459194046__main > .product-form__buttons > #ProductSubmitButton-template--17997459194046__main').click()
  
//      cy.get('.cart-notification-wrapper > #cart-notification > .cart-notification__links > #cart-notification-form > .button').click()
  
//      cy.visit('https://yig0fq-hp.myshopify.com/checkouts/cn/Z2NwLWFzaWEtc291dGhlYXN0MTowMUpITUE0QzJUQjlNUzlHVjZDR1Y5UzdXOA')
  
//      cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #email').type('test@gmail.com')
  
//      cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField0').click()
  
//      cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField0').type('test')
  
//      cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField1').click()
  
//      cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField1').type('test')
  
//      cy.get('.\_1ip0g651 > div > .\_7ozb2u2 > span > #error-for-shipping-address1').click()
  
//      cy.get('div > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #shipping-address1').click()
  
//      cy.get('div > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #shipping-address1').type('Testarossa Winery')
  
//      cy.get('.\_1mrl40q0 > .\_7ozb2u2 > .cektnc0 > .\_7ozb2u6 > #TextField6').click()
  
//      cy.get('.\_1mrl40q0 > .RD23h > div > .VZudx > #Select2').click()
  
//      cy.get('.\_1mrl40q0 > .RD23h > div > .VZudx > #Select2').click()
  
//      cy.get('div > #shippingAddressForm > .r62YW > .\_1ip0g651 > .\_1mrl40q0:nth-child(5)').click()
  
//      cy.get('.yyi4nyd > .yyi4nyi > .yyi4nyv > .\_6hzjvo2 > #basic-paymentOnDelivery').click()
  
//      cy.get('.yyi4nyd > .yyi4nyi > .yyi4nyv > .\_6hzjvo2 > #basic-paymentOnDelivery').type('on')
  
//      cy.get('.\_1ip0g651 > div > .\_1ip0g651 > div > #checkout-pay-button').click()
  
//      cy.visit('https://yig0fq-hp.myshopify.com/checkouts/cn/c59ba313df60ef7c4e9a9f2f10356558/thank_you')
  
//      cy.get('.order-summary-toggle > .wrap > .order-summary-toggle__inner > .order-summary-toggle__text--show > span').click()
  
//      cy.get('.order-summary-toggle > .wrap > .order-summary-toggle__inner > .order-summary-toggle__text--hide > span').click()
  
//   })
 
//  })
 