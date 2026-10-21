/**
 * What a tag build must be told before it is allowed to produce a bundle.
 *
 * The tag resolves its collector at BUILD time — `process.env.COLLECTOR_URL || ""` in
 * packages/tracker-core/src/utils/get-context.ts, which Parcel inlines. The `|| ""` is the problem
 * this file exists for: an unset variable does not fail anything. It produces a tag that loads
 * normally, throws nothing, logs nothing unusual, and posts every event to `http://analytics/track`
 * — because the Snowplow SDK reads an empty endpoint as the HOST — where it dies with
 * ERR_NAME_NOT_RESOLVED. Measured, not guessed; see apps/e2e/tests/collector.spec.ts.
 *
 * It has happened: b8b29f56 fixed turbo's strict env mode dropping COLLECTOR_URL after the v2
 * tracker had already shipped a null collector to staging. A build is the last place that can
 * notice, so it notices here.
 *
 * Kept separate from run-parcel.mjs so it can be tested without spawning Parcel.
 */

/**
 * Looks like somewhere events can be POSTed. A bare host counts: get-context.ts normalises it to
 * protocol-relative, because the stored values have been written both ways.
 */
const BARE_HOST = /^(localhost|(\d{1,3}\.){3}\d{1,3}|[a-z0-9-]+(\.[a-z0-9-]+)+)(:\d+)?$/i;
const looksLikeAnEndpoint = (value) => /^(https?:)?\/\/[^/\s]+/.test(value) || BARE_HOST.test(value);

/** The shapes a templating or CI accident leaves behind, which are not "unset" but are not a URL. */
const NOT_A_VALUE = new Set(["undefined", "null", "false", "0", '""', "''"]);

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ errors: string[], warnings: string[] }}
 */
export const checkBuildEnv = (env) => {
  const errors = [];
  const warnings = [];

  // Three names, because the monorepo introduced COLLECTOR_URL while the CircleCI contexts still
  // hold the two the pre-monorepo tag used. A build needs a PRODUCTION-side value: with no `test`
  // parameter the tag reads MJ_PRODUCTION_COLLECTOR_URL, so MJ_STAGING_COLLECTOR_URL alone still
  // leaves ordinary page views with nowhere to go.
  const collector = (env.COLLECTOR_URL ?? "").trim();
  const production = (env.MJ_PRODUCTION_COLLECTOR_URL ?? "").trim();
  const chosen = collector || production;

  if (!chosen) {
    errors.push(
      "No collector is configured.\n" +
        "  The tag reads COLLECTOR_URL, or failing that MJ_PRODUCTION_COLLECTOR_URL (and\n" +
        "  MJ_STAGING_COLLECTOR_URL when the tag carries ?test=). None of them is set, and an unset\n" +
        "  collector does not fail — it ships a tag that posts to http://analytics/track and is\n" +
        "  never heard from again. Refusing to build rather than hand you that.\n" +
        "    production  MJ_PRODUCTION_COLLECTOR_URL=//collector-azsx401.dmp.cnna.io\n" +
        "    staging     MJ_STAGING_COLLECTOR_URL=//collector.dmp.mediajel.ninja\n" +
        "  In CircleCI these live in the context the job uses (PRODUCTION or STAGING).",
    );
  } else if (NOT_A_VALUE.has(chosen)) {
    errors.push(`The collector is the literal string "${chosen}", which is a templating accident, not a collector.`);
  } else if (!looksLikeAnEndpoint(chosen)) {
    errors.push(
      `The collector is "${chosen}", which is not somewhere events can be posted.\n` +
        "  Expected a host, //host, http://host or https://host.",
    );
  }

  const customTags = (env.FRICTIONLESS_CUSTOMTAG_URL ?? "").trim();
  if (!customTags) {
    // Not fatal: a tag without it is a working tag that simply loads no custom tags. Said out loud
    // because the loader is compiled out entirely, so nothing downstream can tell it was wanted.
    warnings.push(
      "FRICTIONLESS_CUSTOMTAG_URL is not set, so this build loads no custom tags at all —\n" +
        "  the loader is compiled out, and nothing at runtime will say so.",
    );
  }

  return { errors, warnings };
};

export default checkBuildEnv;
