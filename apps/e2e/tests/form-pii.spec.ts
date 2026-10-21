import { expect, fixtureUrl, test } from "./fixtures";

/**
 * The form denylist, which Snowplow's own testing guide calls out as worth a test: form tracking
 * captures field values, so a filter is the only thing between a password box and the pipeline.
 *
 * `isNonSensitiveFormField` excludes anything whose name, id or type mentions a password, an email
 * address, a phone number, a card, an SSN, a secret, a token or a birth date. It is wired into both
 * tracker versions' enableFormTracking. A regex that stops matching, or a wiring change that drops
 * the filter argument, would start sending customers' credentials with no other visible symptom.
 *
 * Typing into every field and asserting on what arrives is the only way to see that from outside.
 */

const SENT = ["full_name", "favourite_strain"];
const NEVER_SENT = ["email", "password", "phone", "cc-number"];

const VALUES: Record<string, string> = {
  full_name: "Jordan Doe",
  favourite_strain: "Blue Dream",
  email: "jordan@example.com",
  password: "hunter2-not-a-real-password",
  phone: "+1 555 0100",
  "cc-number": "4111111111111111",
};

test("form tracking sends the harmless fields and never the sensitive ones", async ({ page, micro }) => {
  await page.goto(fixtureUrl({ appId: "e2e-form-pii", version: "2" }));
  await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");

  // Fill every field and move on, so each one fires a change. Blur by focusing the next field:
  // Snowplow's change_form fires on change/blur, not on every keystroke.
  for (const field of [...SENT, ...NEVER_SENT]) {
    await page.fill(`#${field}`, VALUES[field]);
    await page.locator("#signup button").focus();
  }

  const changes = await micro.waitFor(
    (events) => events.filter((e) => e.event?.event_name === "change_form").length >= SENT.length,
    `a change_form for each of ${SENT.join(", ")}`,
  );

  const forms = changes.filter((e) => e.event?.event_name === "change_form");
  const fieldsSeen = forms.map((e) => JSON.stringify(e.unstruct ?? e));

  for (const field of SENT) {
    expect(
      fieldsSeen.some((seen) => seen.includes(field)),
      `${field} should have been tracked`,
    ).toBe(true);
  }

  // The assertion that matters. Checked against the whole event, not just the field name, so a
  // value arriving under some other key is caught too.
  const everything = JSON.stringify(forms);
  for (const field of NEVER_SENT) {
    expect(everything.includes(field), `${field} must never be tracked`).toBe(false);
    expect(everything.includes(VALUES[field]), `the value of ${field} must never be tracked`).toBe(false);
  }

  expect(await micro.bad()).toHaveLength(0);
  expect(await micro.consistent()).toBe(true);
});
