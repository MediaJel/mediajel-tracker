<h1 align="center"><strong>Mediajel universal tracker</strong></h1>

[![dumi](https://img.shields.io/badge/docs%20by-dumi-blue)](https://github.com/umijs/dumi)

<div align="center"><img src="public/logo.png "width="200" height="200" /></div>

## Features :rocket:

- :package: Out of the box, plug and play tracker that collects Page view & Ecommerce data ... and possibly more?
- :chart_with_upwards_trend: Data collection & integrations made easy.
- :computer: Multiple integration development environments all in one place.
- :open_file_folder: Deployment of trackers & config all in one place.
- :wrench: Pass in `arguments` to the URL strings for easy configuration.

The collector the script tag points to is currently the test collector as its default collector. We're going to enable an option in the query string to indicate the collector URL.

## Usage

Import this script tag to the header/footer of a site. Append the `{APP_ID_HERE}` argument to contain the app id you would use for your site/app.
NOTE: CI/CD pipeline not yet in place for deployment.

```javascript
<script src="https://cdn.jsdelivr.net/gh/MediaJel/mediajel-tracker/mediajelTracker.js?mediajelAppId={APP_ID_HERE}&environment={CART_PROVIDER_HERE}&test"></script>
```

### Arguments

### `@REQUIRED | mediajelAppId={STRING}`

Input the App Id for the collector on this argument.

### `@REQUIRED | environment={ENUM}`

Input the cart environment for the collector on this argument.

<b>Options:</b>

`jane`

### `@OPTIONAL | &test`

Append `&test` at then end of the URL if you want to switch to the test collector.

## Pre-requisites

First, you should have node, and ensure that the node version is 10.13 or above.

```javascript
$ node -v
v10.13.0
```

## Development

```javascript
npm install
npm run dev
```

## Dependencies/Architecture

<table>
<tr>
 <td width="160" height="160" align="center">
      <a target="_blank" href="https://parceljs.org/">
        <img src="https://parceljs.org/assets/parcel-front.webp" />
        <br />
        <strong>Parcel JS</strong>
      </a>
    </td>
      <td width="160" height="160"  align="center">
      <a target="_blank" href="https://getbootstrap.com/">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Bootstrap_logo.svg/1024px-Bootstrap_logo.svg.png" />
        <br />
        <strong>Bootstrap</strong>
      </a>
    </td>
    </tr>
</table>

## Road Map

### Functions

- [ ] Implement collectorURL as a query string argument
- [ ] Integrate multiple integration developer environments, all accessible in one place.

### Platforms

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
