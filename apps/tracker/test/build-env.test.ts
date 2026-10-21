import { describe, expect, test } from "bun:test";

// @ts-expect-error — a plain .mjs script, deliberately not part of the TS build.
import { checkBuildEnv } from "../scripts/build-env.mjs";

/**
 * The rules that decide whether a tag build is allowed to produce a bundle.
 *
 * Worth testing rather than trusting, because the thing being prevented is silent: every case below
 * that returns an error would otherwise produce a tag that builds, deploys, loads on a client's page
 * and sends nothing anywhere.
 */

const CUSTOM_TAGS = { FRICTIONLESS_CUSTOMTAG_URL: "https://test-custom-tags.cnna.io" };
const VIA_MJ = { ...CUSTOM_TAGS, MJ_PRODUCTION_COLLECTOR_URL: "//collector-azsx401.dmp.cnna.io" };
const VIA_COLLECTOR_URL = { ...CUSTOM_TAGS, COLLECTOR_URL: "//collector-azsx401.dmp.cnna.io" };

describe("which names count as a collector", () => {
  test("MJ_PRODUCTION_COLLECTOR_URL alone is enough — it is what the CircleCI contexts hold", () => {
    expect(checkBuildEnv(VIA_MJ)).toEqual({ errors: [], warnings: [] });
  });

  test("COLLECTOR_URL alone is enough — it is what the monorepo introduced", () => {
    expect(checkBuildEnv(VIA_COLLECTOR_URL)).toEqual({ errors: [], warnings: [] });
  });

  // With no ?test= on the tag, get-context reads the PRODUCTION name. A build carrying only the
  // staging one would send every ordinary page view nowhere.
  test("MJ_STAGING_COLLECTOR_URL alone is NOT enough", () => {
    const { errors } = checkBuildEnv({ ...CUSTOM_TAGS, MJ_STAGING_COLLECTOR_URL: "//collector.dmp.mediajel.ninja" });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("No collector is configured");
  });
});

describe("what stops a build", () => {
  test("no collector at all is an error naming every variable that would satisfy it", () => {
    const { errors } = checkBuildEnv(CUSTOM_TAGS);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("COLLECTOR_URL");
    expect(errors[0]).toContain("MJ_PRODUCTION_COLLECTOR_URL");
    expect(errors[0]).toContain("//collector-azsx401.dmp.cnna.io");
  });

  test("whitespace is not a value", () => {
    expect(checkBuildEnv({ ...CUSTOM_TAGS, COLLECTOR_URL: "   " }).errors).toHaveLength(1);
  });

  // `echo "COLLECTOR_URL=${SOME_UNSET_VAR}"` and friends: set, non-empty, and still nothing.
  test.each(["undefined", "null", "false", "0", '""'])("the literal %p is a templating accident", (value) => {
    const { errors } = checkBuildEnv({ ...CUSTOM_TAGS, COLLECTOR_URL: value });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("templating accident");
  });

  test("something that is not a host at all is rejected", () => {
    const { errors } = checkBuildEnv({ ...CUSTOM_TAGS, COLLECTOR_URL: "not a host" });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not somewhere events can be posted");
  });
});

describe("the shapes a stored value comes in", () => {
  // get-context normalises a bare host to protocol-relative, so all three are usable.
  test.each([
    "//host.example",
    "http://localhost:4330",
    "https://host.example",
    "collector-azsx401.dmp.cnna.io",
    "localhost:4330",
    "127.0.0.1:9090",
  ])("%p is accepted", (value) => {
    expect(checkBuildEnv({ ...CUSTOM_TAGS, COLLECTOR_URL: value }).errors).toEqual([]);
  });
});

describe("what only warns", () => {
  test("no custom tag URL is a warning, because the build is still a working tag", () => {
    const { errors, warnings } = checkBuildEnv({ MJ_PRODUCTION_COLLECTOR_URL: "//collector-azsx401.dmp.cnna.io" });

    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("loads no custom tags");
  });
});
