<h1 align="center"><strong>Mediajel universal tracker</strong></h1>
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
<script src="https://cdn.jsdelivr.net/gh/MediaJel/mediajel-tracker/mediajelTracker.js?mediajelAppId={APP_ID_HERE}"></script>
```

## Development

```javascript
npm install //install dev dependencies
npm run dev //deploys dev server (handled by Parcel.js)
```

## Dependencies/Architecture

<table>
<tr>
 <td width="160" align="center">
      <a target="_blank" href="https://parceljs.org/">
        <img src="https://parceljs.org/assets/parcel-front.webp" />
        <br />
        <strong>Parcel JS</strong>
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
