<h1 align="center"><strong>Mediajel universal tracker</strong></h1>

![React](https://badges.aleen42.com/src/react.svg)
![TypeScript](https://badges.frapsoft.com/typescript/awesome/typescript.png?v=101)

<div align="center"><img src="public/logo.png "width="200" height="200" /></div>

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

### Production/Main

```javascript
<script src="https://tags.cnna.io/?appId=APP_ID_HERE&retailId=RETAIL_ID_HERE&environment=CART_PLATFORM_HERE&test=true"></script>
```

### Staging (for testing & development)

```javascript
<script src="http://tags.mediajel.ninja/?appId=APP_ID_HERE&retailId=RETAIL_ID_HERE&environment=CART_PLATFORM_HERE&test=true"></script>
```

### Arguments

### `@REQUIRED | AppId={STRING}`

Input the App Id for the collector on this argument. This will trigger a pageview event.

### `@OPTIONAL | environment={STRING}`

Append the Retail ID of the ecommerce site here. It is
imperative that the Retail ID is persistent from initial
visit up until cart checkout.

### `@OPTIONAL | environment={OPTIONS:ENUM}`

Input the cart environment for the collector on this argument. This will trigger ecommerce tracking for the specific environment.

<table>
  <tr>
    <th>
      <b>Options
      </b>
    </th>
  </tr>
  <tr>
    <td>jane</td>
  </tr>
    <tr>
    <td>dutchie</td>
  </tr>
    <tr>
    <td>meadow</td>
  </tr>
    <tr>
    <td>tymber</td>
  </tr>
</table>

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

If you want to test your tracker configuration is working and the environment is not available within this repository. You may want to deploy your tracker to `AWS cloudfront.` so you may test it on a live environment. You will require the appropriate `.env` files that point to the appropriate `staging` Cloudfront CDN server. Please contact the team for the `.env` files.

## Development

Run the development server through the following commands:

```
npm install

npm run dev
```

If you have the appropriate `.env` files. You may deploy your changes to AWS cloudfront staging via the `deploy` command. This will update the `staging` AWS S3 Bucket & AWS Cloudfront CDN. Then you may take the Cloudfront URL and inject it to a website to test if the appropriate tracker configuration is tracking the correct events for the environment/platform you are working on.

```
npm run deploy
```

## Dev Dependencies/Architecture

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
      <a target="_blank" href="https://reactjs.org/">
        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" />
        <br />
        <strong>React JS</strong>
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

## Road Map

- [ ] Implement Duplication safety
  - [x] Universal tag will not duplicate if another universal tag is present
  - [x] Universal tag will not duplicate if another raw javascript tag is present
- [ ] Develop Tests
  - [ ] Implement tests within CircleCI
  - [ ] Develop Unit tests for instantiation of the Snowplow tracker
  - [ ] Develop Unit tests for pageviews
  - [ ] Develop Unit tests for Ecommerce platforms
    - [ ] Develop tests for Jane
    - [ ] Develop tests for Dutchie
    - [ ] Develop tests for Meadow
    - [ ] Develop tests for Tymber
