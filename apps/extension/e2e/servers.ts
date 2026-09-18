import fs from "node:fs";
import http from "node:http";
import path from "node:path";

/**
 * The three tiny servers the specs stand up on 127.0.0.1: a static server for the fixture pages,
 * another for the vendored tag build, and a stub collector that answers 200 to anything and keeps
 * what it was sent. Plain Node, no framework — each is a screenful and starts in a millisecond.
 *
 * The ports are fixed because the fixture pages and the vendored bundle name them in their
 * markup; a random port would mean rewriting both on every run.
 */

/** Serves `e2e/fixtures`: the pages a spec navigates to. */
export const FIXTURE_PORT = 4000;
/** Serves `e2e/fixtures/vendor`: the production tag build, fetched once by `vendor-tag.mjs`. */
export const VENDOR_PORT = 3001;
/** Serves `e2e/fixtures/announcing`: this repo's tag build, made once by `build-announcing-tag.mjs`. */
export const ANNOUNCING_PORT = 3002;
/** The stub collector. The vendored bundle's collector host carries this port; see the README. */
export const COLLECTOR_PORT = 4443;
/** Serves `e2e/out/site`: the preview build of the panel with the chrome stub in front of it. */
export const PREVIEW_PORT = 4010;

/** The production bundle's collector host. Chrome resolves it to 127.0.0.1 while the harness runs. */
export const COLLECTOR_HOST = "collector-azsx401.dmp.cnna.io";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

export interface Server {
  url: string;
  close(): Promise<void>;
}

const listen = (server: http.Server, port: number): Promise<Server> =>
  new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });

/** The file a request path names inside `root`, or null when it escapes the root or is not there. */
const fileFor = (root: string, url: string): string | null => {
  const pathname = decodeURIComponent(new URL(url, "http://127.0.0.1").pathname);
  const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!file.startsWith(root + path.sep)) return null;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
};

/** A static file server over one directory. Nothing is cached, so a rebuilt file is served at once. */
export const serveStatic = (dir: string, port: number): Promise<Server> => {
  const root = path.resolve(dir);
  const server = http.createServer((request, response) => {
    const file = fileFor(root, request.url ?? "/");
    if (!file) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end(`Not found under ${root}: ${request.url}`);
      return;
    }
    response.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    fs.createReadStream(file).pipe(response);
  });
  return listen(server, port);
};

/** One request the stub collector received. */
export interface CollectorHit {
  method: string;
  url: string;
  body: string;
}

export interface CollectorStub extends Server {
  hits: CollectorHit[];
  /** Resolves with the first hit `matches` accepts, polling until `timeoutMs` has passed. */
  waitForHit(matches: (hit: CollectorHit) => boolean, timeoutMs: number): Promise<CollectorHit>;
}

const readBody = (request: http.IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

/**
 * The tag POSTs its batches cross-origin with a JSON content type and credentials, so the browser
 * asks first. Every answer carries what that preflight needs, or the batch would never be sent
 * and there would be nothing for `chrome.webRequest` to hear.
 */
const corsHeaders = (request: http.IncomingMessage): Record<string, string> => ({
  "access-control-allow-origin": request.headers.origin ?? "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": request.headers["access-control-request-headers"] ?? "content-type",
  "access-control-max-age": "600",
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A collector that accepts everything and remembers it. `hits` is shared with the spec, which is
 * what lets a test say "the page sent a `payload_data` batch naming this app ID" without trusting
 * the extension's own account of it.
 */
export const startCollectorStub = async (port: number = COLLECTOR_PORT): Promise<CollectorStub> => {
  const hits: CollectorHit[] = [];
  const server = http.createServer((request, response) => {
    void readBody(request).then((body) => {
      if (request.method !== "OPTIONS") hits.push({ method: request.method ?? "", url: request.url ?? "", body });
      response.writeHead(request.method === "OPTIONS" ? 204 : 200, corsHeaders(request));
      response.end();
    });
  });
  const base = await listen(server, port);
  const waitForHit: CollectorStub["waitForHit"] = async (matches, timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const hit = hits.find(matches);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`The stub collector heard nothing matching within ${timeoutMs} ms.`);
      await sleep(250);
    }
  };
  return { ...base, hits, waitForHit };
};

/** The app IDs a collector hit names, read the way the extension reads them: `aid` in a `payload_data` batch. */
export const appIdsIn = (hit: CollectorHit): string[] => {
  try {
    const batch = JSON.parse(hit.body) as { schema?: string; data?: { aid?: unknown }[] };
    if (!/payload_data/.test(batch.schema ?? "") || !Array.isArray(batch.data)) return [];
    return [...new Set(batch.data.map((event) => event.aid).filter((aid): aid is string => typeof aid === "string"))];
  } catch {
    return [];
  }
};
