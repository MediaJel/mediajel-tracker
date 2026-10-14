import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Logger } from "@nestjs/common";

import type { ApiError } from "~/features/integrations-assistant/errors";
import { OpenAiProvider } from "~/features/integrations-assistant/providers/openai.provider";

/**
 * What a failed model call tells the browser. The provider's own text can carry request ids,
 * account details or the prompt back; the operator gets a sentence, and the log gets the text.
 */

const provider = new OpenAiProvider({ get: () => undefined } as never);

/** The translation from a thrown error to what the panel is told. */
const explain = (err: unknown): ApiError =>
  (provider as unknown as { describe(err: unknown, model: string): ApiError }).describe(err, "gpt-test");

describe("a failed model call", () => {
  const logged: string[] = [];
  let spy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logged.length = 0;
    spy = spyOn(Logger.prototype, "error").mockImplementation((line: unknown) => {
      logged.push(String(line));
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  test("is logged in full, and the browser is told only that it failed", () => {
    const raw = "upstream said: org-abc123 has no quota left for key sk-proj-xyz";

    const told = explain(new Error(raw));

    expect(told.getStatus()).toBe(502);
    expect(told.message).not.toContain("sk-proj");
    expect(told.message).not.toContain("upstream said");
    expect(logged.some((line) => line.includes(raw))).toBe(true);
  });

  test("that ran out of time names a limit inside the extension's two minutes", () => {
    const told = explain(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }));

    expect(told.getStatus()).toBe(504);
    expect(told.message).toContain("110 seconds");
  });
});
