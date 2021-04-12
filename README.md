<h1 align="center"><strong>Mediajel universal tracker</strong></h1>

## Description

A plug and play tracker that collects Page view & Ecommerce data (... and possibly more?) In terms of options & configurations it only takes in 1 argument after the URL string which is `appId` Please see <b>Usage</b> below. We are hoping to add `collector URLs` as a parameter in the query string as well.

## Usage

Import this script tag to the header/footer of a site. Append the `{APP_ID_HERE}` argument to contain the app id you would use for your site/app.

```javascript
<script src="https://cdn.jsdelivr.net/gh/MediaJel/mediajel-tracker/mediajelTracker.js?mediajelAppId={APP_ID_HERE}"></script>
```

## Road Map

- [x] Jane platform
  - [x] Add to Cart
  - [x] Remove From Cart
  - [x] Transactions
  - [x] Transaction_items (objects in baskets)
- [x] Meadow platform (To refactor code to the js file but I know it works)
  - [x] Add to Cart
  - [x] Remove From Cart
  - [x] Transactions
  - [x] Transaction_items (objects in baskets)
- [ ] Dutchie Iframe
  - [ ] Add to Cart
  - [ ] Remove From cart
  - [x] Transactions
  - [ ] Transaction_items (objects in baskets)
- [ ] Webjoint
  - [ ] Add to Cart
  - [ ] Remove From cart
  - [ ] Transactions
  - [ ] Transaction_items (objects in baskets)
