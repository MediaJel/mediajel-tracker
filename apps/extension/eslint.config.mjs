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
    ignores: ["dist/**", ".plasmo/**"],
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
