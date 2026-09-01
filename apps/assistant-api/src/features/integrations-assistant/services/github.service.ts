import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ApiError } from "../errors";

/**
 * The GitHub Contents API, with MediaJel's own deploy credential.
 *
 * This used to run in the browser with the operator's personal access token, which meant every
 * engineer had to hold a token that could write to the tags repo and paste it into a client's
 * page. Now the token lives here, in one place, rotatable in one place, and the operator holds
 * nothing.
 *
 * The committer identity is the factory bot's, deliberately: a widget deploy and a
 * frictionless-tags-factory deploy should be indistinguishable in the repo's history, because
 * they are the same act. Who actually did it is in the commit message, from the verified
 * Cognito identity rather than from a name someone typed.
 */

const API = "https://api.github.com";

export const REPO_BRANCH = "master";
export const BOT_IDENTITY = {
  name: "Frictionless Tags Factory",
  email: "frictionless-tags-factory@mediajel.com",
} as const;

const DEFAULT_REPO = "MediaJel/mediajel-frictionless-custom-tag";

export const deployRepo = (repo?: string): string => repo?.trim() || DEFAULT_REPO;

export interface ExistingFile {
  sha: string;
  content: string;
}

export interface CommitResult {
  commitUrl: string;
  fileUrl: string;
  sha: string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Every one of these is a message an operator reads. None of them mentions a token they hold,
 * because they do not hold one — a 401 here is MediaJel's problem, and it says so.
 */
const describe = (status: number, path: string, repo: string): ApiError => {
  switch (status) {
    case 401:
      return new ApiError(
        502,
        "github",
        "GitHub rejected MediaJel's deploy credential. A MediaJel engineer needs to rotate GITHUB_TOKEN.",
      );
    case 403:
      return new ApiError(
        502,
        "github",
        "GitHub refused the deploy (403). MediaJel's credential may lack Contents: write, or the API is rate limiting.",
      );
    case 404:
      return new ApiError(
        502,
        "github",
        `GitHub cannot see ${path} (404). MediaJel's credential may not include ${repo}.`,
      );
    case 409:
    case 422:
      return new ApiError(
        409,
        "conflict",
        "The file changed in the repo while you were working. Re-open the deploy step so it can read the current version.",
      );
    default:
      return new ApiError(502, "github", `GitHub answered ${status} while deploying. Try again.`);
  }
};

const utf8ToBase64 = (value: string): string => Buffer.from(value, "utf8").toString("base64");
const base64ToUtf8 = (value: string): string => Buffer.from(value.replace(/\n/g, ""), "base64").toString("utf8");

export interface GitHubClient {
  getFile(path: string): Promise<ExistingFile | null>;
  putFile(input: { path: string; content: string; message: string; sha?: string }): Promise<CommitResult>;
}

export const createGitHubClient = (token: string, repoName: string, fetchImpl: FetchLike = fetch): GitHubClient => {
  const repo = deployRepo(repoName);
  const encode = (path: string): string => encodeURIComponent(path).replace(/%2F/g, "/");

  const call = (method: string, path: string, body?: unknown): Promise<Response> =>
    fetchImpl(`${API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "mediajel-assistant-api",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  return {
    getFile: async (path) => {
      const response = await call("GET", `/repos/${repo}/contents/${encode(path)}?ref=${REPO_BRANCH}`);
      if (response.status === 404) return null;
      if (!response.ok) throw describe(response.status, path, repo);
      const data = (await response.json()) as { sha: string; content?: string };
      return { sha: data.sha, content: data.content ? base64ToUtf8(data.content) : "" };
    },

    putFile: async ({ path, content, message, sha }) => {
      const response = await call("PUT", `/repos/${repo}/contents/${encode(path)}`, {
        message,
        content: utf8ToBase64(content),
        branch: REPO_BRANCH,
        ...(sha ? { sha } : {}),
        committer: BOT_IDENTITY,
        author: BOT_IDENTITY,
      });
      if (!response.ok) throw describe(response.status, path, repo);
      const data = (await response.json()) as {
        commit: { html_url: string; sha: string };
        content: { html_url: string };
      };
      return { commitUrl: data.commit.html_url, fileUrl: data.content.html_url, sha: data.commit.sha };
    },
  };
};

export const githubToken = (token: string | undefined): string => {
  const trimmed = token?.trim();
  if (!trimmed) {
    throw new ApiError(
      500,
      "misconfigured",
      "The assistant service has no deploy credential. A MediaJel engineer needs to set GITHUB_TOKEN.",
    );
  }
  return trimmed;
};

/**
 * The client, built per request from configuration. Cheap — it holds a token and a closure, no
 * connection — and building it per call means a rotated credential takes effect immediately
 * rather than at the next restart.
 */
@Injectable()
export class GithubService {
  constructor(private readonly config: ConfigService) {}

  get repo(): string {
    return deployRepo(this.config.get<string>("WIDGET_AUTH_REPO"));
  }

  client(): GitHubClient {
    return createGitHubClient(githubToken(this.config.get<string>("GITHUB_TOKEN")), this.repo);
  }
}
