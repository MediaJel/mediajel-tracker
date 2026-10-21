/**
 * The rig: one origin carrying the fixture page, the built tag and Snowplow Micro.
 *
 * Same trick as apps/integrations/server.ts, reduced to what a tag test needs. One origin matters
 * because the tag posts with `eventMethod: "post"` and reads cookies; a cross-origin collector drags
 * CORS preflights and SameSite into every assertion, and a failure there looks exactly like a tag
 * that never fired.
 *
 *   /                      the fixture page (fixtures/page.html)
 *   /stimuli/<name>.json   what that page puts on itself before the tag loads
 *   /tag/*  and  /*.js     the tag build from ../tracker/dist, chunks included
 *   /analytics/track       proxied to Micro, whose micro.conf maps it to the tp2 endpoint
 *   /micro/*               Micro's REST API, so assertions are same-origin too
 *   /api/checkout|signup   echo endpoints, for sources that read a request body
 *
 * Deliberately NOT apps/integrations/server.ts itself: that one serves the training site from its
 * own dist, which would put a React build on the critical path of every tag test and let an
 * unrelated app's build failure read as a tracking regression.
 */
import { fileURLToPath } from "node:url";

/** The web root: fixtures/ is served at /, so page.html is / and stimuli/x.json is /stimuli/x.json. */
const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));
const TAG_DIST = fileURLToPath(new URL("../../tracker/dist/", import.meta.url));

/** Micro's collector + REST paths. Anything here is forwarded untouched. */
const MICRO_PREFIXES = [
  "/micro",
  "/analytics/track",
  "/i",
  "/com.snowplowanalytics.snowplow",
  "/com.snowplowanalytics.iglu",
];

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

export interface Rig {
  url: string;
  stop(): void;
}

const isMicro = (path: string): boolean =>
  MICRO_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));

const fileAt = async (base: string, rel: string): Promise<Response | null> => {
  // A path from the network: keep it inside `base` whatever it claims to be.
  const resolved = new URL(rel, "file:///").pathname.replace(/^\/+/, "");
  const file = Bun.file(base + resolved);
  if (!(await file.exists())) return null;
  const response = new Response(file);
  response.headers.set("cache-control", "no-store");
  return response;
};

/**
 * Reads the upstream body in full before answering. Re-streaming Micro's response while Bun has
 * already decompressed it corrupts it, and the browser reports that as a 503 from the collector.
 */
const proxyToMicro = async (req: Request, micro: string, path: string, search: string): Promise<Response> => {
  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
    const contentType = req.headers.get("content-type");
    if (contentType) init.headers = { "content-type": contentType };
  }
  const upstream = await fetch(micro + path + search, init);
  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", ...CORS },
  });
};

export const startRig = (port: number, microUrl: string): Rig => {
  const micro = microUrl.replace(/\/$/, "");

  const server = Bun.serve({
    port,
    idleTimeout: 60,
    async fetch(req) {
      const url = new URL(req.url);
      const path = decodeURIComponent(url.pathname);

      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

      // Sources that read a request body (fetch/XHR capture) need something to read. Echo it back.
      if (path === "/api/checkout" || path === "/api/signup") {
        return Response.json(await req.json().catch(() => ({})), { headers: CORS });
      }

      if (isMicro(path)) {
        try {
          return await proxyToMicro(req, micro, path, url.search);
        } catch (err) {
          // Distinguishable on purpose: a test that sees this knows Micro is down, not that the
          // tag stayed silent.
          return Response.json(
            { error: "snowplow-micro unreachable", detail: String(err) },
            { status: 502, headers: CORS },
          );
        }
      }

      if (path.startsWith("/tag/")) {
        return (
          (await fileAt(TAG_DIST, path.slice("/tag/".length) || "index.js")) ??
          new Response(`no tag build at ${TAG_DIST} — run: bun x turbo run build --filter=mediajel-tracker`, {
            status: 404,
          })
        );
      }

      const rel = path === "/" ? "page.html" : path.replace(/^\//, "");
      const own = await fileAt(FIXTURES, rel);
      if (own) return own;

      // The tag's code-split chunks are named relative to the site root, not to /tag/.
      if (/\.(js|map)$/.test(rel)) {
        const chunk = await fileAt(TAG_DIST, rel);
        if (chunk) return chunk;
      }

      return new Response(`not found: ${rel}`, { status: 404 });
    },
  });

  return { url: `http://localhost:${server.port}`, stop: () => server.stop(true) };
};
