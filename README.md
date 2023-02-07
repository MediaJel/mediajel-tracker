<h1 align="center"><strong>Mediajel universal tracker</strong></h1>

<div align="center"><img src="https://github.com/MediaJel/mediajel-tracker/raw/staging/public/logo.png"width="200" height="200" /></div>

## Features :rocket:

- :package: Out of the box, plug and play tracker that collects Page view & Ecommerce data ... and possibly more?
- :chart_with_upwards_trend: Data collection & integrations made easy.
- :computer: Multiple integration development environments all in one place.
- :open_file_folder: Deployment of trackers & config all in one place.
- :wrench: Pass in `arguments` to the URL strings for easy configuration.

The collector the script tag points to is currently the test collector as its default collector. We're going to enable an option in the query string to indicate the collector URL.

## Usage

Import this script tag to the header/footer of a site. Append the `APP_ID_HERE` argument to contain the app id you would use for your site/app.
NOTE: CI/CD pipeline not yet in place for deployment.


### Impressions tag

```html
<script src='https://tags.cnna.io/?appId=LiquidM&event=impression&environment=liquidm&advertiserId={CUSTOMER_ID}&insertionOrder={CAMPAIGN_ID}&lineItemId=LiquidM_Main&creativeId={AD_NAME}&publisherId={PUBLISHER_ID}&publisherName={PUBLISHER_NAME}&siteId={APP_DOMAIN}&siteName={SITE_NAME}&liquidmAppId={APP_STOREURL}&appName={APP_NAME}&clickId={CLICK_ID}&GAID={GAID}&GAID_MD5={GAID_MD5}&GAID_SHA1={GAID_SHA1}&IDFA={IDFA}&IDFA_MD5={IDFA_MD5}&IDFA_SHA1={IDFA_SHA1}'> </script>
``

### Production/Main

```javascript
<script src="https://tags.cnna.io/?appId=APP_ID_HERE&retailId=RETAIL_ID_HERE&environment=CART_PLATFORM_HERE&test=true"></script>
```

### Staging (for testing & development)

```javascript
<script src="http://tags.mediajel.ninja/?appId=APP_ID_HERE&retailId=RETAIL_ID_HERE&environment=CART_PLATFORM_HERE&test=true"></script>
```

### Multiple Plugin Support

The universal tag supports the implementation of multiple plugins in 1 tag via a comma seperated list
Please see the documentation below for the different plugins that are supported.

```html
<script src="https://tags.cnna.io/?appId=universal-tag-staging&plugin=googleAds,bingAds&conversionId=10963714894&conversionLabel=vdmmCNLemOADEM6G9Oso&tagId=187009645&environment=jane"></script>
```

### Google Ads (Plugin)

`conversionId` is the Google Ads conversion ID, usually in the format `AW-XXXXXXXXXX`

`conversionLabel` is the Google Ads conversion label, This is found in the Google Ads "Conversions" tab after you've created a conversion

`crossDomainSites` is a comma separated list of domains that you want to track cross domain conversions for. This is optional.

This will also track transactions and send it to our snowplow collectors and google ads all in one tag.

```html
<script src="https://tags.cnna.io/?appId=APP_ID_HERE
&plugin=googleAds
&conversionId=AW-11111111111
&conversionLabel=CONVERSION_LABEL_HERE
&environment=CART_PLATFORM_HERE
&crossDomainSites=google.com,example.com"></script>
```

### Bing Ads (Plugin)

This will also track transactions and send it to our snowplow collectors and bing ads all in one tag.

`tagId` is the Bing Ads tag ID, usually in the format `11111111`

```html
<script src="https://tags.cnna.io/?appId=APP_ID_HERE
&plugin=bingAds
&tagId=11111111
&environment=CART_PLATFORM_HERE"></script>
```

### Arguments

### `@REQUIRED | AppId={STRING}`

Input the App Id for the collector on this argument. This will trigger a pageview event.

### `@OPTIONAL | retailId={STRING}`

Append the Retail ID of the ecommerce site here. It is
imperative that the Retail ID is persistent from initial
visit up until cart checkout.

### `@OPTIONAL | environment={OPTIONS:ENUM}`

Input the cart environment for the collector on this argument. This will trigger ecommerce tracking for the specific environment.

**Options:**

- jane
- dutchie-iframe
- dutchie-subdomain
- greenrush
- lightspeed
- meadow
- olla
- shopify
- tymber
- woocommerce

### `@OPTIONAL | &test={BOOLEAN}`

Append `&test=true` at then end of the URL if you want to switch to the test collector.

## Pre-requisites

### `Node >= v10.13.0`

First, you should have node, and ensure that the node version is 10.13 or above.

```
$ node -v
v10.13.0
```

### `aws-cli >= v2.2.10`

You also need to install the aws-cli for deploying changes to the staging version.
Reference to install `aws-cli v2.2.10` [here](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html). You may check your `aws-cli` version by running the command below

```
$ aws --version
aws-cli/2.2.10 Python/3.8.8 Linux/5.8.0-55-generic exe/x86_64.zorin.16 prompt/off

```

### `.env` files

If you want to test your tracker configuration is working and the environment is not available within this repository. You may want to deploy your current tracker config to `AWS cloudfront` or `AWS S3` so you may test it on a live environment. You will require the appropriate `.env` files that point to the appropriate `staging` Cloudfront CDN server (or AWS S3.) Please contact the team for the `.env` files.

## Development

Run the development server through the following commands:

```bash
yarn install

yarn start

# Open http://localhost:1234
```

If you have the appropriate `.env` files. You may deploy your changes to AWS cloudfront staging or S3 via the `deploy` command. This will update the `staging` AWS S3 Bucket & AWS Cloudfront CDN. Then you may take the Cloudfront or S3 URL and inject it to a website to test if the appropriate tracker configuration is tracking the correct events for the environment/platform you are working on.

```
npm run deploy
```

## Dev Dependencies/Architecture

<table>
<tr>
 <td width="160" height="160" align="center">
      <a target="_blank" href="https://parceljs.org/">
        <img src="https://parceljs.org/avatar.b1be591d.avif" />
        <br />
        <strong>Parcel JS</strong>
      </a>
    </td>
    <td width="160" height="160"  align="center">
      <a target="_blank" href="https://eslint.org/">
        <img src="https://camo.githubusercontent.com/a5e575e94f48ea666506fe28bf0eaf475ef28b2ed8e5b829e48a21f9c6390d49/68747470733a2f2f63646e2e776f726c64766563746f726c6f676f2e636f6d2f6c6f676f732f65736c696e742e737667" />
        <br />
        <strong>ESLint</strong>
      </a>
    </td>
    <td width="160" height="160"  align="center">
      <a target="_blank" href="https://github.com/motdotla/dotenv#readme">
        <img src="https://raw.githubusercontent.com/motdotla/dotenv/master/dotenv.png" />
        <br />
        <strong>dotenv</strong>
      </a>
    </td>
    </tr>
</table>
