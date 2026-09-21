import { afterEach, describe, expect, test } from "bun:test";

import { InternalServiceActivitySource } from "~/features/integrations-assistant/providers/internal-service.source";

/**
 * The HTTP half of tag activity: exactly what internal-service is sent, and what its refusals
 * become.
 *
 * `fetch` is swapped on the global rather than threaded through a parameter, because this binding
 * is replaced wholesale on the move to external-service and its replacement will not have one.
 * Every message asserted here is shown to an operator, beside the tag it concerns.
 */

const CONFIGURED = {
  INTERNAL_SERVICE_URL: "http://internal-service.test//",
  INTERNAL_SERVICE_BEARER_TOKEN: "test-token",
};

const sourceWith = (values: Record<string, string | undefined> = CONFIGURED): InternalServiceActivitySource =>
  new InternalServiceActivitySource({ get: (key: string) => values[key] } as never);

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

interface Sent {
  url: string;
  init?: RequestInit;
}

/** Answers every request with one status and body, and records what was sent. */
const internalServiceAnswers = (status: number, body: unknown): Sent[] => {
  const sent: Sent[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    sent.push({ url, init });
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return sent;
};

const fetchThrows = (err: unknown): void => {
  globalThis.fetch = (async () => {
    throw err;
  }) as unknown as typeof fetch;
};

describe("what internal-service is sent", () => {
  test("activity: the app ID's own path, encoded, for the days asked, with the bearer token", async () => {
    const sent = internalServiceAnswers(200, { pageviews: 1 });

    await sourceWith().activity("shop 1/a", 7);

    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe("http://internal-service.test/api/tracker/events/activity/shop%201%2Fa?daysToTrack=7");
    const headers = new Headers(sent[0]!.init?.headers);
    expect(headers.get("authorization")).toBe("Bearer test-token");
    expect(headers.get("accept")).toBe("application/json");
    // The timeout travels with the request; without a signal a hung internal-service hangs the panel.
    expect(sent[0]!.init?.signal).toBeInstanceOf(AbortSignal);
  });

  test("page URLs: their own path, and the rows out of internal-service's envelope", async () => {
    const rows = [{ page_url: "https://shop.example.com/thank-you", page_url_count: "3", tr_total: null }];
    const sent = internalServiceAnswers(200, { rows });

    expect(await sourceWith().pageUrls("app-1", 7)).toEqual(rows);
    expect(sent[0]!.url).toBe("http://internal-service.test/api/tracker/events/page-url-activity/app-1?daysToTrack=7");
  });
});

describe("a refusal from internal-service", () => {
  test("carries internal-service's own words", async () => {
    internalServiceAnswers(400, {
      statusCode: 400,
      message: "Timeout exceeded: elapsed 30.2 seconds",
      error: "Bad Request",
    });

    await expect(sourceWith().activity("app-1", 7)).rejects.toThrow(
      "internal-service answered 400: Timeout exceeded: elapsed 30.2 seconds.",
    );
  });

  test("carries every message a validation pipe listed", async () => {
    internalServiceAnswers(400, {
      statusCode: 400,
      message: ["daysToTrack must be at least 1 day", "daysToTrack must be a number"],
      error: "Bad Request",
    });

    await expect(sourceWith().pageUrls("app-1", 7)).rejects.toThrow(
      "internal-service answered 400: daysToTrack must be at least 1 day; daysToTrack must be a number.",
    );
  });

  test("still names the status when the body is not Nest's", async () => {
    internalServiceAnswers(502, "<html><body>Bad Gateway</body></html>");

    await expect(sourceWith().activity("app-1", 7)).rejects.toThrow("internal-service answered 502.");
  });

  test("of the credential says which variable a MediaJel engineer has to check", async () => {
    internalServiceAnswers(401, { statusCode: 401, message: "Invalid x-api-key", error: "Unauthorized" });

    await expect(sourceWith().activity("app-1", 7)).rejects.toThrow(
      "internal-service answered 401: Invalid x-api-key. A MediaJel engineer needs to check INTERNAL_SERVICE_BEARER_TOKEN.",
    );
  });
});

describe("no answer at all", () => {
  test("a timeout reads as a sentence rather than as an abort", async () => {
    fetchThrows(new DOMException("The operation was aborted due to timeout", "TimeoutError"));

    await expect(sourceWith().activity("app-1", 7)).rejects.toThrow(
      "MediaJel's tag activity service did not answer within 20 seconds.",
    );
  });

  test("a connection that fails says internal-service could not be reached", async () => {
    fetchThrows(new TypeError("fetch failed"));

    await expect(sourceWith().pageUrls("app-1", 7)).rejects.toThrow(
      "internal-service could not be reached (fetch failed).",
    );
  });
});

describe("whether the source is configured", () => {
  test("needs both the URL and the token", () => {
    expect(sourceWith().configured()).toBe(true);
    expect(sourceWith({ ...CONFIGURED, INTERNAL_SERVICE_URL: undefined }).configured()).toBe(false);
    expect(sourceWith({ ...CONFIGURED, INTERNAL_SERVICE_BEARER_TOKEN: undefined }).configured()).toBe(false);
  });

  test("does not count blanks as set", () => {
    expect(sourceWith({ ...CONFIGURED, INTERNAL_SERVICE_URL: "  " }).configured()).toBe(false);
    expect(sourceWith({ ...CONFIGURED, INTERNAL_SERVICE_BEARER_TOKEN: " " }).configured()).toBe(false);
  });
});
