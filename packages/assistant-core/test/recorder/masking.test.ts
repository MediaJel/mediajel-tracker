import { describe, expect, test } from "bun:test";

import isNonSensitiveFormField from "@mediajel/tracker-core/snowplow/form-pii-filter";
import { isSensitiveKey, maskObject, maskText, maskValue } from "@mediajel/assistant-core/session/masking";

describe("key sensitivity", () => {
  test("is a superset of tracker-core's form PII filter", () => {
    // Every name the tracker refuses to track, the widget refuses to store.
    const blockedByTracker = [
      "password",
      "email",
      "e-mail",
      "phone",
      "tel",
      "ssn",
      "social-security",
      "card-number",
      "cc-number",
      "cvv",
      "cvc",
      "client_secret",
      "auth_token",
      "dob",
      "birthdate",
    ];
    for (const name of blockedByTracker) {
      expect(isNonSensitiveFormField({ name }), name).toBe(false);
      expect(isSensitiveKey(name), name).toBe(true);
    }
  });

  test("does not mask commerce fields the generator needs", () => {
    for (const key of ["city", "state", "country", "currency", "total", "sku", "quantity", "item_name"]) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });
});

describe("maskText", () => {
  test("emails keep their shape, never their value", () => {
    expect(maskText("contact jane.doe@example.com now")).toBe("contact j***@e***.com now");
  });

  test("card numbers keep the last four", () => {
    expect(maskText("paid with 4242 4242 4242 4242 today")).toBe("paid with **** 4242 today");
  });

  test("SSNs disappear entirely", () => {
    expect(maskText("ssn 123-45-6789")).toBe("ssn ***-**-****");
  });

  test("phone numbers keep the last four", () => {
    expect(maskText("call 415-555-0142")).toContain("0142");
    expect(maskText("call 415-555-0142")).not.toContain("415-555");
  });

  test("order ids and totals pass through untouched", () => {
    expect(maskText("order T4821 total $84.00")).toBe("order T4821 total $84.00");
  });
});

describe("maskValue", () => {
  test("passwords and tokens vanish regardless of value", () => {
    expect(maskValue("password", "hunter2")).toBe("<masked>");
    expect(maskValue("github_token", "ghp_abc")).toBe("<masked>");
  });

  test("emails and phones keep recognisable shape under their key", () => {
    expect(maskValue("email", "jane@example.com")).toBe("j***@e***.com");
    expect(maskValue("phone", "4155550142")).toBe("***-0142");
  });
});

describe("maskObject", () => {
  test("walks nested payloads, masking by key and sweeping free text", () => {
    const masked = maskObject({
      event: "purchase",
      customer: { email: "jane@example.com", city: "Oakland" },
      note: "receipt sent to jane@example.com",
      total: 84,
    }) as Record<string, unknown>;

    expect((masked.customer as Record<string, unknown>).email).toBe("j***@e***.com");
    expect((masked.customer as Record<string, unknown>).city).toBe("Oakland");
    expect(masked.note).toBe("receipt sent to j***@e***.com");
    expect(masked.total).toBe(84);
  });

  test("survives cycles and depth without recursing forever", () => {
    const loop: Record<string, unknown> = { a: 1 };
    loop.self = loop;
    expect((maskObject(loop) as Record<string, unknown>).self).toBe("[cycle]");
  });
});
