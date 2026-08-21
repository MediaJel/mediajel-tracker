import { WidgetRuntime } from "@mediajel/tracker-widget/runtime";

/**
 * The GitHub Contents API over plain fetch — the same calls the frictionless-tags-factory
 * bot makes, with its exact committer identity, so widget deploys are indistinguishable in
 * the repo's history from factory deploys. All traffic goes through the pristine fetch.
 */

export const REPO_OWNER = "MediaJel";
export const REPO_NAME = "mediajel-frictionless-custom-tag";
export const REPO_BRANCH = "master";

export const BOT_IDENTITY = {
  name: "Frictionless Tags Factory",
  email: "frictionless-tags-factory@mediajel.com",
} as const;

const API = "https://api.github.com";

export interface GitHubUser {
  login: string;
  name: string | null;
  email: string | null;
}

export interface ExistingFile {
  sha: string;
  content: string;
}

export interface CommitResult {
  commitUrl: string;
  fileUrl: string;
  sha: string;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

const describe = (status: number, path?: string): string => {
  switch (status) {
    case 401:
      return "GitHub rejected the token (401). Check it in Settings.";
    case 403:
      return "GitHub refused (403) — the token may lack Contents: write on the tags repo, need SAML authorization, or be rate limited.";
    case 404:
      return `GitHub cannot see ${path ?? "the repository"} with this token (404) — fine-grained tokens must explicitly include ${REPO_OWNER}/${REPO_NAME}.`;
    case 409:
    case 422:
      return "GitHub reports the file changed under us (409/422) — re-checking the repo and trying once more usually fixes it.";
    default:
      return `GitHub call failed (${status}).`;
  }
};

/** UTF-8 → base64 without the Buffer polyfill (which would bloat the chunk). */
export const utf8ToBase64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const base64ToUtf8 = (value: string): string => {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export interface GitHubClient {
  getUser(): Promise<GitHubUser>;
  getFile(path: string): Promise<ExistingFile | null>;
  putFile(input: { path: string; content: string; message: string; sha?: string }): Promise<CommitResult>;
}

export const createGitHubClient = (token: string, runtime: WidgetRuntime): GitHubClient => {
  const call = async (method: string, path: string, body?: unknown): Promise<Response> =>
    runtime.pristineFetch(`${API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  return {
    getUser: async () => {
      const response = await call("GET", "/user");
      if (!response.ok) throw new GitHubError(describe(response.status), response.status);
      const data = (await response.json()) as GitHubUser;
      return { login: data.login, name: data.name, email: data.email };
    },

    getFile: async (path) => {
      const response = await call(
        "GET",
        `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${REPO_BRANCH}`,
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new GitHubError(describe(response.status, path), response.status);
      const data = (await response.json()) as { sha: string; content?: string };
      return { sha: data.sha, content: data.content ? base64ToUtf8(data.content) : "" };
    },

    putFile: async ({ path, content, message, sha }) => {
      const response = await call(
        "PUT",
        `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
        {
          message,
          content: utf8ToBase64(content),
          branch: REPO_BRANCH,
          ...(sha ? { sha } : {}),
          committer: BOT_IDENTITY,
          author: BOT_IDENTITY,
        },
      );
      if (!response.ok) throw new GitHubError(describe(response.status, path), response.status);
      const data = (await response.json()) as {
        commit: { html_url: string; sha: string };
        content: { html_url: string };
      };
      return { commitUrl: data.commit.html_url, fileUrl: data.content.html_url, sha: data.commit.sha };
    },
  };
};
