import { describe, expect, test } from "bun:test";

import { recogniseCustomTag } from "@mediajel/assistant-core/wire/custom-tags";

/**
 * The custom-tag fetches the tag makes as it boots, named for what they load. The domain file's
 * URL is the one observed on terrabis.co (2026-09-19); the app-id file's is the same shape.
 */

const BASE = "https://test-custom-tags.cnna.io";
const APP_ID = "5f976cbb-7d29-46ce-bf07-0f701478d800";

describe("recognising a custom-tag fetch", () => {
  test("the domain file is named for the site; nothing on the row says which tag asked", () => {
    expect(recogniseCustomTag(`${BASE}/domains/dGVycmFiaXMuY28=.js`)).toEqual({
      source: "custom-tag",
      scope: "domain",
      name: "terrabis.co",
      url: `${BASE}/domains/dGVycmFiaXMuY28=.js`,
      appId: "",
      pageUrl: "",
    });
  });

  test("the app-id file is named for the tag, and the name fills the row's app ID", () => {
    expect(recogniseCustomTag(`${BASE}/app-ids/${btoa(APP_ID)}.js`)).toEqual({
      source: "custom-tag",
      scope: "app-id",
      name: APP_ID,
      url: `${BASE}/app-ids/${btoa(APP_ID)}.js`,
      appId: APP_ID,
      pageUrl: "",
    });
  });

  test("a name the tag would write with the URL-safe alphabet reads the same", () => {
    expect(recogniseCustomTag(`${BASE}/domains/${btoa("127.0.0.1").replace(/=+$/, "")}.js`)).toMatchObject({
      scope: "domain",
      name: "127.0.0.1",
    });
  });

  test("a name that is not base64, or decodes to nothing readable, is no custom tag", () => {
    expect(recogniseCustomTag(`${BASE}/domains/%%%.js`)).toBeNull();
    expect(recogniseCustomTag(`${BASE}/domains/AAE=.js`)).toBeNull();
  });

  test("any other file, path or text is no custom tag", () => {
    expect(recogniseCustomTag(`${BASE}/domains/dGVycmFiaXMuY28=.css`)).toBeNull();
    expect(recogniseCustomTag(`${BASE}/index.js`)).toBeNull();
    expect(recogniseCustomTag("https://tags.cnna.io/?appId=x")).toBeNull();
    expect(recogniseCustomTag("not a url")).toBeNull();
  });
});
