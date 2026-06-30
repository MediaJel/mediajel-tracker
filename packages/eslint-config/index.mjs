import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

/**
 * Shared flat ESLint config for the MediaJel monorepo.
 * Mirrors the legacy .eslintrc.json intent (ts-eslint recommended + prettier + import).
 */
export default [
  {
    ignores: [
      "**/dist/**",
      "**/.parcel-cache/**",
      "**/node_modules/**",
      "**/parcel-bundle-reports/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...(tsPlugin.configs?.recommended?.rules ?? {}),
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "prettier/prettier": "error",
    },
  },
  prettierConfig,
];
