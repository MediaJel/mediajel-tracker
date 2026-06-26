/**
 * Dev server for the Integrations training site. Puts the app, the built tag, and the
 * Snowplow Micro API on ONE origin so the sandbox iframe + tag + collector + Micro REST
 * are all same-origin (zero CORS):
 *   - serves the Parcel build from ./dist
 *   - serves the locally-built tag from ../tracker/dist at /tag/* (and its root chunks)
 *   - proxies the collector paths and /micro/* to Snowplow Micro (:9090)
 *
 * The proxy reads upstream bodies fully and re-emits only safe headers (content-type + CORS).
 * Forwarding Micro's content-encoding/length while Bun auto-decompresses would corrupt the
 * response and surface as 503s in the browser — which would also break the sandboxed tag's
 * chunk loads. Everything is wrapped so the handler never throws (no spurious 503s).
 */
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 4321);
const MICRO = (process.env.MICRO_URL ?? "http://localhost:9090").replace(/\/$/, "");
const DIST = fileURLToPath(new URL("./dist/", import.meta.url));
const TAG_DIST = fileURLToPath(new URL("../tracker/dist/", import.meta.url));

const MICRO_PREFIXES = [
  "/micro",
  "/analytics/track",
  "/i",
  "/com.snowplowanalytics.snowplow",
  "/com.snowplowanalytics.iglu",
];
const isMicro = (p: string) => MICRO_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/"));

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

async function fileAt(base: string, rel: string, noStore = false): Promise<Response | null> {
  const f = Bun.file(base + rel);
  if (!(await f.exists())) return null;
  const r = new Response(f);
  if (noStore) r.headers.set("cache-control", "no-store");
  return r;
}

async function proxyMicro(req: Request, path: string, search: string): Promise<Response> {
  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
    const ct = req.headers.get("content-type");
    init.headers = ct ? { "content-type": ct } : undefined;
  }
  const resp = await fetch(MICRO + path + search, init);
  const buf = await resp.arrayBuffer(); // read fully — never re-stream upstream body
  return new Response(buf, {
    status: resp.status,
    headers: { "content-type": resp.headers.get("content-type") || "application/json", ...CORS },
  });
}

const MOCK_ORDER = {
  id: "NET-7700",
  total: 88.5,
  tax: 6.5,
  shipping: 0,
  currency: "USD",
  city: "Denver",
  state: "CO",
  country: "USA",
  items: [{ sku: "NET-1", name: "CBD Tincture", category: "wellness", unitPrice: 41, quantity: 2 }],
};

Bun.serve({
  port: PORT,
  idleTimeout: 60,
  error(err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { "content-type": "application/json", ...CORS },
    });
  },
  async fetch(req) {
    const url = new URL(req.url);
    const p = decodeURIComponent(url.pathname);
    try {
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

      // Lesson 6 mock order endpoint — order-shaped JSON the tracker's fetch source auto-detects.
      if (p === "/mock/orders") return Response.json(MOCK_ORDER, { headers: CORS });

      // Exercises feature — the simulated store/form POSTs here on checkout / sign-up. We echo the
      // posted JSON back so the learner's fetch/XHR capture (and the inspector's Network sniffer)
      // see a clean 200 with the order/user body; the request body is what the capture reads.
      if (p === "/api/checkout" || p === "/api/signup") {
        const body = await req.json().catch(() => ({}));
        return Response.json(body, { headers: CORS });
      }

      // Proxy collector + Micro REST API.
      if (isMicro(p)) {
        try {
          return await proxyMicro(req, p, url.search);
        } catch (e) {
          return new Response(JSON.stringify({ error: "Snowplow Micro unreachable", detail: String(e) }), {
            status: 502,
            headers: { "content-type": "application/json", ...CORS },
          });
        }
      }

      // The locally-built tag.
      if (p.startsWith("/tag/")) {
        const rel = p.slice("/tag/".length) || "index.js";
        return (
          (await fileAt(TAG_DIST, rel, true)) ??
          new Response(`tag asset not found: ${rel} (run: bun x turbo run build --filter=mediajel-tracker)`, {
            status: 404,
          })
        );
      }

      // App static assets.
      const rel = p === "/" ? "index.html" : p.replace(/^\//, "");
      const appFile = await fileAt(DIST, rel);
      if (appFile) return appFile;

      // Tag code-split chunks are requested at the ROOT (Parcel default public URL) — serve from the tag build.
      if (/\.(js|map)$/.test(rel)) {
        const tagChunk = await fileAt(TAG_DIST, rel, true);
        if (tagChunk) return tagChunk;
      }

      // SPA fallback.
      const index = await fileAt(DIST, "index.html");
      if (index) {
        index.headers.set("content-type", "text/html; charset=utf-8");
        return index;
      }
      return new Response("Site not built. Run: bun x turbo run build --filter=@mediajel/integrations", {
        status: 404,
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "server error", detail: String(e) }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS },
      });
    }
  },
});

// eslint-disable-next-line no-console
console.log(
  `\n  ▸ Integrations training site →  http://localhost:${PORT}\n  ▸ Snowplow Micro proxied at  →  ${MICRO}\n`,
);
