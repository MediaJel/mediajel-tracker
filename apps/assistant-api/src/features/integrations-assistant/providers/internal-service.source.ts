import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { unanswered } from "./service-failure";
import type { RawActivity, RawPageUrlRow, TagActivitySource } from "./tag-activity.source";

/**
 * internal-service over `fetch`, with the same URL and bearer token gql-service reads it with.
 *
 * Failures are plain `Error`s, not ApiErrors, because one app ID failing is not a failed request:
 * ActivityService turns each rejection into that tag's `unavailable` entry, so every message here
 * is read by the operator beside the one tag it concerns, and says what internal-service said.
 */

const TIMEOUT_MS = 20_000;

/** What the operator calls it, which is not what the repo calls it. */
const ACTIVITY = "MediaJel's tag activity service";

/**
 * internal-service fails a query with Nest's own body, `{ statusCode, message, error }`, where
 * `message` is a sentence or — from a validation pipe — a list of them. Those words are the part
 * worth showing; a body that is not that shape (a proxy's error page) leaves only the status.
 */
const refusal = async (response: Response): Promise<Error> => {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = body?.message;
  const said = (Array.isArray(message) ? message : [message]).filter((part) => typeof part === "string").join("; ");
  const answered = `internal-service answered ${response.status}${said ? `: ${said}` : ""}.`;
  return new Error(
    response.status === 401 || response.status === 403
      ? `${answered} A MediaJel engineer needs to check INTERNAL_SERVICE_BEARER_TOKEN.`
      : answered,
  );
};

@Injectable()
export class InternalServiceActivitySource implements TagActivitySource {
  constructor(private readonly config: ConfigService) {}

  configured(): boolean {
    return !!(this.baseUrl() && this.token());
  }

  async activity(appId: string, days: number): Promise<RawActivity> {
    return this.get<RawActivity>(`/api/tracker/events/activity/${encodeURIComponent(appId)}?daysToTrack=${days}`);
  }

  async pageUrls(appId: string, days: number): Promise<RawPageUrlRow[]> {
    const body = await this.get<{ rows: RawPageUrlRow[] }>(
      `/api/tracker/events/page-url-activity/${encodeURIComponent(appId)}?daysToTrack=${days}`,
    );
    return body.rows;
  }

  private baseUrl(): string {
    return this.config.get<string>("INTERNAL_SERVICE_URL")?.trim().replace(/\/+$/, "") ?? "";
  }

  private token(): string {
    return this.config.get<string>("INTERNAL_SERVICE_BEARER_TOKEN")?.trim() ?? "";
  }

  private async get<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}${path}`, {
        headers: { authorization: `Bearer ${this.token()}`, accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw unanswered(err, ACTIVITY, TIMEOUT_MS);
    }
    if (!response.ok) throw await refusal(response);
    return (await response.json()) as T;
  }
}
