import config from "@mediajel/eslint-config";
import globals from "globals";

/**
 * The shared config plus the globals an extension actually runs against.
 *
 * `chrome` is the whole extension API and exists in every realm here except the main-world
 * bridge, which deliberately does not touch it. `RequestInit`/`RequestInfo` are DOM lib types
 * that the shared browser globals list does not carry, and the tests reference them when
 * standing in for `fetch`.
 */
export default [
  ...config,
  {
    // e2e/fixtures/vendor is the production tag build fetched by e2e/vendor-tag.mjs,
    // e2e/fixtures/announcing this repo's tag build made by e2e/build-announcing-tag.mjs, and
    // e2e/out what the harness generates. None of them is ours to lint.
    ignores: ["dist/**", ".plasmo/**", "e2e/fixtures/vendor/**", "e2e/fixtures/announcing/**", "e2e/out/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.webextensions,
        RequestInfo: "readonly",
        RequestInit: "readonly",
      },
    },
  },
];
