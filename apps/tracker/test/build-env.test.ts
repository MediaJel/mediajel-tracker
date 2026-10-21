import { describe, expect, test } from "bun:test";

// @ts-expect-error — a plain .mjs script, deliberately not part of the TS build.
import { checkBuildEnv } from "../scripts/build-env.mjs";

/**
 * The rules that decide whether a tag build is allowed to produce a bundle.
 *
 * Worth testing rather than trusting, because the thing being prevented is silent: every case below
 * that returns an error would otherwise produce a tag that builds, deploys, loads on a client's
 * page and sends nothing anywhere.
 */

const OK = {
  COLLECTOR_URL: "//collector-azsx401.dmp.cnna.io",
  FRICTIONLESS_CUSTOMTAG_URL: "https://test-custom-tags.cnna.io",
};

describe("what stops a build", () => {
  test("a complete environment passes with nothing to say", () => {
    expect(checkBuildEnv(OK)).toEqual({ errors: [], warnings: [] });
  });

  test("an unset collector is an error, and the message names the variable", () => {
    const { errors } = checkBuildEnv({ ...OK, COLLECTOR_URL: undefined });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("COLLECTOR_URL is not set");
    // The message has to carry the values, or the person reading it in CI has to go and find them.
    expect(errors[0]).toContain("//collector-azsx401.dmp.cnna.io");
    expect(errors[0]).toContain("//collector.dmp.mediajel.ninja");
  });

  test("whitespace is not a value", () => {
    expect(checkBuildEnv({ ...OK, COLLECTOR_URL: "   " }).errors).toHaveLength(1);
  });

  // `echo "COLLECTOR_URL=${SOME_UNSET_VAR}"` and friends: set, non-empty, and still nothing.
  test.each(["undefined", "null", "false", "0", '""'])(
    "the literal %p is a templating accident, not a collector",
    (value) => {
      const { errors } = checkBuildEnv({ ...OK, COLLECTOR_URL: value });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("templating accident");
    },
  );

  test("a bare host is rejected — the tag posts to <collector>/analytics/track and needs a scheme", () => {
    const { errors } = checkBuildEnv({ ...OK, COLLECTOR_URL: "collector-azsx401.dmp.cnna.io" });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not an endpoint");
  });

  test.each(["//host.example", "http://localhost:4330", "https://host.example"])("%p is accepted", (value) => {
    expect(checkBuildEnv({ ...OK, COLLECTOR_URL: value }).errors).toEqual([]);
  });
});

describe("what only warns", () => {
  test("no custom tag URL is a warning, because the build is still a working tag", () => {
    const { errors, warnings } = checkBuildEnv({ ...OK, FRICTIONLESS_CUSTOMTAG_URL: undefined });

    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("loads no custom tags");
  });
});
