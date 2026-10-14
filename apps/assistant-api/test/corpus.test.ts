import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  HELPER_SIGNATURES,
  TEMPLATE_DATALAYER,
  TEMPLATE_SIGNUP,
  TEMPLATE_SPA,
  TEMPLATE_XHR,
} from "../src/features/integrations-assistant/knowledge/knowledge.constants";
import { ValidateService } from "../src/features/integrations-assistant/services/validate.service";

/**
 * The generator is told to imitate `mediajel-frictionless-custom-tag`, and the deploy gate
 * decides what may enter it. So the repo itself is the test: run every shipped tag through the
 * gate and see which of our rules it fails.
 *
 * Not every failure is our bug, and that distinction is the whole point of this file:
 *
 *   DESCRIPTIVE rules claim to describe the repo — the import allowlist above all. A shipped tag
 *   failing one is our rule being wrong, and it silently blocks the assistant from writing the
 *   very files it is imitating. That is what this test guards: it must stay at zero.
 *
 *   PRESCRIPTIVE rules are deliberately stricter than the repo. Dedup (77% of tags have no guard
 *   at all), plain-JS (the repo is TypeScript; we need `new Function` to parse it so the operator
 *   can verify it in the browser), and the `window.tracker(` ban (superseded by trackTrans) are
 *   standards we hold on purpose. Their failure counts are recorded, not asserted — they measure
 *   the repo against the standard, and they should fall over time rather than being loosened here.
 *
 * The repo is a sibling checkout, not a dependency, so this skips when it is absent.
 */

const REPO = join(__dirname, "../../../../mediajel-frictionless-custom-tag/src");

const PRESCRIPTIVE = [
  /no dedup guard found/,
  /not valid plain JavaScript/,
  /window\.tracker/,
  /window\.overrides/,
  /no external or inline scripts/,
  /no fetch calls of its own/,
  /no XHR of its own/,
];

/** Helpers the allowlist excludes on purpose; a tag using one is expected to fail. */
const DELIBERATELY_EXCLUDED = [
  "trans-deduplicator", // window.tracker, and a literal key "key" shared across every tag
  "v3-tracker", // builds its own Snowplow tracker, bypassing window.trackTrans
  "leafly-display-tracker", // one site's display logic, not tag-authoring surface
  "parse-retail-id", // imports repo-internal types the generated file cannot see
];

const corpus = (): { name: string; code: string; appIdTarget: boolean }[] => {
  const out: { name: string; code: string; appIdTarget: boolean }[] = [];
  for (const dir of ["domains", "app-ids"]) {
    for (const file of readdirSync(join(REPO, dir))) {
      if (!file.endsWith(".ts")) continue;
      const code = readFileSync(join(REPO, dir, file), "utf8");
      if (!code.includes("trackTrans(") && !code.includes("trackSignUp(")) continue;
      out.push({ name: `${dir}/${file}`, code, appIdTarget: dir === "app-ids" });
    }
  }
  return out;
};

describe("the rules, measured against every shipped tag", () => {
  test.skipIf(!existsSync(REPO))("no shipped tag fails a rule that claims to describe the repo", () => {
    const service = new ValidateService();
    const offenders: string[] = [];
    const prescriptive = new Map<string, number>();

    for (const { name, code, appIdTarget } of corpus()) {
      const goal = code.includes("trackTrans(") ? "transaction" : "signup";
      for (const error of service.validate({ code, goal, appIdTarget })) {
        if (PRESCRIPTIVE.some((rule) => rule.test(error))) {
          const key = PRESCRIPTIVE.find((rule) => rule.test(error))!.source;
          prescriptive.set(key, (prescriptive.get(key) ?? 0) + 1);
          continue;
        }
        if (DELIBERATELY_EXCLUDED.some((helper) => error.includes(helper))) continue;
        offenders.push(`${name}: ${error}`);
      }
    }

    // Printed, not asserted — see the header.
    console.log("  prescriptive failures:", Object.fromEntries(prescriptive));

    expect(offenders).toEqual([]);
  });

  /**
   * Read the allowlist out of the source rather than exporting it for the test: it is the
   * security boundary the drift test pins byte-for-byte, and widening its export surface to
   * make a test tidier is how that pin comes loose.
   */
  test("every allowlisted helper is documented to the model, and vice versa", () => {
    const source = readFileSync(
      join(__dirname, "../src/features/integrations-assistant/services/rewrite-imports.ts"),
      "utf8",
    );
    const table = source.slice(source.indexOf("const IMPORT_ALLOWLIST"));
    const allowlisted = new Set(table.slice(0, table.indexOf("\n};")).match(/\.\.\/libs\/[a-z0-9/-]+/gi) ?? []);
    const documented = new Set(HELPER_SIGNATURES.match(/\.\.\/libs\/[a-z0-9/-]+/gi) ?? []);

    expect([...allowlisted].sort()).toEqual([...documented].sort());
  });

  /**
   * The templates are the model's worked examples, so a template that would be refused at deploy
   * teaches the model to write refused files. TEMPLATE_DATALAYER was exactly that: a real shipped
   * tag with no dedup guard, in the one shape that needs it most, since datalayerSource replays.
   */
  test("every template the model is told to imitate would itself be accepted", () => {
    const service = new ValidateService();
    const templates = [
      ["TEMPLATE_DATALAYER", TEMPLATE_DATALAYER, "transaction"],
      ["TEMPLATE_XHR", TEMPLATE_XHR, "transaction"],
      ["TEMPLATE_SPA", TEMPLATE_SPA, "transaction"],
      ["TEMPLATE_SIGNUP", TEMPLATE_SIGNUP, "signup"],
    ] as const;

    for (const [name, code, goal] of templates) {
      // The leading `//` header is commentary about the example, not part of it.
      expect([name, service.validate({ code: code.replace(/^\/\/.*$/gm, ""), goal, appIdTarget: false })]).toEqual([
        name,
        [],
      ]);
    }
  });
});
