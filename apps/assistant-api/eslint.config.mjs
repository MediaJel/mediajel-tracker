import config from "@mediajel/eslint-config";
import globals from "globals";

/**
 * The shared config, run against Node rather than a browser.
 *
 * `fetch`, `Response` and `RequestInit` are Node 18+ globals that the shared browser list does
 * not carry — the GitHub client uses all three, and takes a `FetchLike` seam so tests can stand
 * in for them.
 */
export default [
  ...config,
  {
    ignores: ["dist/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        fetch: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
      },
    },
  },
];
