import { describe, expect, test } from "bun:test";

import { URL_CHAR_CAP, maskedUrl, parseUrl } from "@mediajel/assistant-core/wire/url";

/**
 * A URL as the ledger keeps one: its query values masked the way a recording is, the path kept,
 * the whole cut to the cap. The sign-up URL is a third-party template with the tag's macros
 * filled in — the one place a person's details reach a URL.
 */

describe("keeping a URL", () => {
  test("masks an email, a phone and a card in the query by their keys, and keeps everything else", () => {
    expect(
      maskedUrl(
        "https://pixel.example/signup?email=jane.doe@example.com&phone=555-123-4567&card=4111111111111111&order=T4821&flag#done",
      ),
    ).toBe("https://pixel.example/signup?email=j***@e***.com&phone=***-4567&card=**** 1111&order=T4821&flag#done");
  });

  test("sweeps a value under any key for the shapes, percent-decoding it first", () => {
    expect(maskedUrl("https://pixel.example/p?note=jane.doe%40example.com&seg=bLeKCx2Vm0S5qAaJ7dE1fw")).toBe(
      "https://pixel.example/p?note=j***@e***.com&seg=bLeKCx2Vm0S5qAaJ7dE1fw",
    );
  });

  test("a segment, an order id and an amount read as they were sent", () => {
    const beacon = "https://r.turn.com/r/beacon?b2=bVey-3fRZmk1&cid=T4821&bprice=84";
    expect(maskedUrl(beacon)).toBe(beacon);
  });

  test("cuts the URL to the cap", () => {
    const kept = maskedUrl(`https://pixel.example/p?pad=${"x".repeat(2_000)}`);
    expect(kept).toHaveLength(URL_CHAR_CAP + 1);
    expect(kept.endsWith("…")).toBe(true);
  });

  test("text that is not a URL is masked as text; parseUrl says so", () => {
    expect(maskedUrl("mailto jane.doe@example.com")).toBe("mailto j***@e***.com");
    expect(parseUrl("not a url")).toBeNull();
    expect(parseUrl("https://r.turn.com/r/beacon")?.hostname).toBe("r.turn.com");
  });
});
