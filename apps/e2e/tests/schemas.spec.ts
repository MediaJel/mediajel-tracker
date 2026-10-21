import { expect, test } from "./fixtures";

/**
 * Every Iglu schema the tag names, resolved before anything is sent.
 *
 * A tracker that names a schema the registry does not have does not fail loudly: the event is
 * collected, quarantined as a bad event, and lost. The only evidence is a resolution error buried
 * in the bad event, and the symptom reaching anyone is "that event type stopped appearing".
 *
 * So ask the resolver directly. This list is every `iglu:` literal in the tag's source — when
 * someone bumps a version in code, this test fails on the version that does not exist yet, and says
 * which repositories it asked.
 */

const SCHEMAS = [
  "iglu:com.mediajel.contexts/campaign/jsonschema/1-0-0",
  "iglu:com.mediajel.contexts/client/jsonschema/1-0-0",
  "iglu:com.mediajel.contexts/identities/jsonschema/1-0-0",
  "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3",
  "iglu:com.mediajel.events/enhanced_transaction/jsonschema/1-0-1",
  "iglu:com.mediajel.events/record/jsonschema/1-0-2",
  "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
  "iglu:com.mediajel.events/sign_up/jsonschema/1-0-4",
];

for (const schema of SCHEMAS) {
  test(`${schema} resolves`, async ({ micro }) => {
    const { ok, detail } = await micro.resolves(schema);

    expect(ok, `${schema} did not resolve. Micro tried:\n${JSON.stringify(detail, null, 2)}`).toBe(true);
  });
}

test("a version that does not exist is reported as unresolved, not as success", async ({ micro }) => {
  // The control for the tests above: proves `resolves` can actually say no. Without it, a resolver
  // answering 200 to everything would make the whole list green.
  const { ok } = await micro.resolves("iglu:com.mediajel.events/sign_up/jsonschema/9-9-9");

  expect(ok).toBe(false);
});
