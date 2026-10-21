import config from "@mediajel/eslint-config";

/**
 * The shared config, plus the two things this package needs.
 *
 * `no-undef` is off for TypeScript here because it cannot see type-only identifiers — `RequestInit`
 * and friends are erased before runtime, so the rule reports them as undefined globals. TypeScript
 * itself checks what this rule is for, and `bun run check` runs it.
 *
 * `Bun` is a real runtime global: rig/server.ts serves with Bun.serve, under bun, by design.
 */
export default [
  ...config,
  {
    files: ["**/*.ts"],
    languageOptions: { globals: { Bun: "readonly" } },
    rules: { "no-undef": "off" },
  },
];
