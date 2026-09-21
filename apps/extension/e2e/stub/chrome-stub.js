/*
 * The `chrome` the panel runs against in the visual matrix.
 *
 * Loaded before the bundle by the preview pages `build-preview.mjs` writes, it answers every
 * request in `src/bridge/api.ts` from a table of scenarios chosen by `?scenario=` in the page's
 * query string, keeps a session the way the background would, and pushes changes to the panel
 * over the port it connects — so a click advances the job here exactly as it would in Chrome.
 * `?theme=` is what `settings/read` answers.
 *
 * Every number on screen is fixed. The clock the spec pins (`FIXED_TIME` in panel.spec.ts) is
 * `NOW` here, and the activity's days end on that day, so "Today", "2 hours ago" and the elapsed
 * recording never move between runs.
 */
(() => {
  const params = new URLSearchParams(location.search);
  const scenarioName = params.get("scenario") || "job-home";
  const theme = params.get("theme") || "light";

  const NOW = Date.parse("2026-09-16T15:00:00Z");
  const HOUR = 3_600_000;
  const SITE = "shop.example.com";
  const TAB = { id: 1, windowId: 1, active: true, url: `https://${SITE}/checkout`, title: "Checkout" };
  const IDENTITY = { username: "j.doe", email: "j.doe@mediajel.com", name: "Jordan Doe" };
  const APP_IDS = [
    "5f976cbb-7d29-46ce-bf07-0f701478d800",
    "b8a1c7e2-4f0d-4e2b-9c11-2d7a6f3e9a10",
    "c3e5d9f1-7b2a-4c8e-a6d4-91f0e2b7c5d3",
    "d7f2a4b6-1e9c-4d3f-b8a2-6c5e0f1d2a9b",
  ];

  // ---- what the page carries ----------------------------------------------------------------

  const COLLECTOR = "collector-azsx401.dmp.cnna.io";

  /** The URL a tag like terrabis.co's is loaded from; the params under it are what its record event repeats. */
  const tagSrc = (appId) =>
    `https://tags.cnna.io/?appId=${appId}&environment=production&s1=bLeKCx2Vm0S5qAaJ7dE1fw&s2.pv=ezo6F0kqQm2p&s2.tr=bVey-3fRZmk1&s3.pv=TerrabisMundelein-S3.PV&s3.tr=TerrabisMundelein-S3.TR&version=2&plugin=googleAds&conversionId=AW-17979043318&conversionLabel=w-syCLbq3f0bEPbW8ZQB`;

  /** The tag's configuration as its own record event states it, after the overrides on the page. */
  const configOf = (appId) => ({
    params: {
      s1: "bLeKCx2Vm0S5qAaJ7dE1fw",
      "s2.pv": "ezo6F0kqQm2p",
      "s2.tr": "bVey-3fRZmk1",
      "s3.pv": "TerrabisMundelein-S3.PV",
      "s3.tr": "TerrabisMundelein-S3.TR",
      plugin: "googleAds",
      conversionId: "AW-17979043318",
      conversionLabel: "w-syCLbq3f0bEPbW8ZQB",
    },
    src: tagSrc(appId),
    element: `<script src="${tagSrc(appId)}"></script>`,
    source: "record",
  });

  /** A tag the page has been heard sending events from, as the background records it. */
  const tagOf = (appId, index) => ({
    appId,
    state: "sending",
    environment: "production",
    version: "2",
    event: "",
    announced: false,
    firstSeenAt: NOW - 90_000 + index * 1_000,
    collector: COLLECTOR,
    enabled: true,
    config: configOf(appId),
  });
  const NO_TAG =
    "No MediaJel tag has spoken up on this page. You can still record and generate; Verify needs the tag, so simulate one from the Overview first.";

  /** What the background derives from a tab's tags: the first tag's configuration, and what to warn about. */
  const statusFor = (tags, settled) => {
    const first = tags[0] || { appId: "", environment: "", version: "", event: "", collector: "" };
    return {
      appId: first.appId,
      environment: first.environment,
      version: first.version,
      event: first.event,
      collector: first.collector,
      tagPresent: tags.length > 0,
      tags,
      trackTransPresent: tags.length > 0,
      optedOut: false,
      warnings: tags.length > 0 || !settled ? [] : [NO_TAG],
    };
  };

  /** `settled` is whether the page has had its moment to load a tag; a page still loading is not a page without tags. */
  /** A tag read off the page's script only — before it sent anything, so no collector and no record. */
  /** An older site's tag URL: the legacy names for every segment, and nothing else. */
  const legacySrc = (appId) =>
    `https://tags.cnna.io/?appId=${appId}&segmentId=e-oqTEY2SNGlRzvmH9esjw&s2=ezo6F0kqQm2p&s3=S3-legacy`;
  const scriptTag = (appId, index) => ({
    ...tagOf(appId, index),
    state: "installed",
    collector: "",
    config: {
      params: { segmentId: "e-oqTEY2SNGlRzvmH9esjw", s2: "ezo6F0kqQm2p", s3: "S3-legacy" },
      src: legacySrc(appId),
      element: `<script src="${legacySrc(appId)}"></script>`,
      source: "script",
    },
  });

  /** The edit tried in the `trying` scenarios, and the tag as its record event reads once the page runs it. */
  const TRIED_EDITS = { "s3.pv": "Terrabis-Edited-PV", environment: "jane" };
  const triedTag = (appId, index) => {
    const base = tagOf(appId, index);
    return {
      ...base,
      environment: TRIED_EDITS.environment,
      config: { ...base.config, params: { ...base.config.params, "s3.pv": TRIED_EDITS["s3.pv"] } },
    };
  };

  const PAGES = {
    one: { tags: APP_IDS.slice(0, 1).map(tagOf), settled: true },
    tried: { tags: APP_IDS.slice(0, 1).map(triedTag), settled: true },
    script: { tags: APP_IDS.slice(0, 1).map(scriptTag), settled: true },
    two: { tags: APP_IDS.slice(0, 2).map(tagOf), settled: true },
    three: { tags: APP_IDS.slice(0, 3).map(tagOf), settled: true },
    four: { tags: APP_IDS.map(tagOf), settled: true },
    silent: { tags: [], settled: false },
    "no-tags": { tags: [], settled: true },
  };

  // ---- the recording ------------------------------------------------------------------------

  const PAGE_1 = { id: "pg_1", url: `https://${SITE}/checkout`, title: "Checkout", t: 0 };
  const PAGE_2 = { id: "pg_2", url: `https://${SITE}/checkout/thank-you?order=T4821`, title: "Thank you", t: 13_800 };

  const ORDER_RESPONSE = {
    order_id: "T4821",
    total: 84,
    currency: "USD",
    items: [{ sku: "BD-35", name: "Blue Dream 3.5g", price: 42, qty: 2 }],
  };
  const PURCHASE_PUSH = {
    event: "purchase",
    ecommerce: {
      transaction_id: "T4821",
      value: 84,
      tax: 6.72,
      shipping: 0,
      currency: "USD",
      items: [{ item_id: "BD-35", item_name: "Blue Dream 3.5g", price: 42, quantity: 2 }],
    },
  };

  const network = (id, t, pageId, extra) => ({
    kind: "network",
    id,
    t,
    pageId,
    summary: `${extra.method} ${extra.url}`,
    score: extra.score,
    sub: "fetch",
    reqType: "application/json",
    resType: "application/json",
    ...extra,
  });

  const TIMELINE = [
    {
      kind: "platform",
      id: "ev_1",
      t: 20,
      pageId: "pg_1",
      summary: "platform Shopify",
      score: 0,
      detected: "Shopify",
      globals: ["Shopify", "ShopifyAnalytics"],
      spa: false,
    },
    {
      kind: "click",
      id: "ev_2",
      t: 12_400,
      pageId: "pg_1",
      summary: "click Place order",
      score: 2,
      selector: "button#checkout-pay-button",
      tag: "BUTTON",
      text: "Place order",
      href: null,
    },
    network("ev_3", 13_100, "pg_1", {
      method: "POST",
      url: `https://${SITE}/api/checkout/complete`,
      status: 200,
      reqBody: JSON.stringify({ cart: "c_88", payment: "card" }),
      resBody: JSON.stringify(ORDER_RESPONSE),
      ms: 412,
      category: "page",
      score: 6,
    }),
    {
      kind: "datalayer",
      id: "ev_4",
      t: 13_300,
      pageId: "pg_1",
      summary: "dataLayer purchase",
      score: 8,
      layer: "dataLayer",
      data: PURCHASE_PUSH,
    },
    {
      kind: "nav",
      id: "ev_5",
      t: 13_800,
      pageId: "pg_1",
      summary: "nav load",
      score: 0,
      sub: "load",
      from: PAGE_1.url,
      to: PAGE_2.url,
    },
    { kind: "page", id: "ev_6", t: 13_800, pageId: "pg_2", summary: `page ${PAGE_2.url}`, score: 0 },
    {
      kind: "dom",
      id: "ev_7",
      t: 14_200,
      pageId: "pg_2",
      summary: "dom order confirmed",
      score: 5,
      items: [{ selector: "h1.order-confirmed", text: "Thanks, your order T4821 is confirmed" }],
    },
    network("ev_8", 14_500, "pg_2", {
      method: "POST",
      url: "https://collector-azsx401.dmp.cnna.io/analytics/track",
      status: 200,
      reqBody: "",
      resBody: "",
      ms: 90,
      category: "tracker",
      score: 0,
      summary: "tracker sent page_view",
    }),
    {
      kind: "storage",
      id: "ev_9",
      t: 14_600,
      pageId: "pg_2",
      summary: "storage set checkout_token",
      score: 0,
      area: "local",
      op: "set",
      key: "checkout_token",
      value: "ck_3f9a…",
    },
  ];

  // ---- what the assistant wrote, proved and shipped ------------------------------------------

  const CODE = [
    'import { CustomTag } from "../types";',
    "",
    "export const tag: CustomTag = ({ trackTrans }) => {",
    "  window.dataLayer = window.dataLayer || [];",
    "  const seen = new Set<string>();",
    "  const onPurchase = (entry: any) => {",
    "    const order = entry?.ecommerce;",
    '    if (entry?.event !== "purchase" || !order?.transaction_id) return;',
    "    if (seen.has(order.transaction_id)) return;",
    "    seen.add(order.transaction_id);",
    "    trackTrans({",
    "      id: String(order.transaction_id),",
    "      total: Number(order.value),",
    "      tax: Number(order.tax ?? 0),",
    "      shipping: Number(order.shipping ?? 0),",
    '      city: "",',
    '      state: "",',
    '      country: "US",',
    '      currency: order.currency || "USD",',
    "      items: (order.items || []).map((item: any) => ({",
    "        orderId: String(order.transaction_id),",
    "        sku: String(item.item_id),",
    "        name: item.item_name,",
    '        category: "",',
    "        unitPrice: Number(item.price),",
    "        quantity: Number(item.quantity),",
    '        currency: order.currency || "USD",',
    "      })),",
    "    });",
    "  };",
    "  window.dataLayer.forEach(onPurchase);",
    "  const push = window.dataLayer.push.bind(window.dataLayer);",
    "  window.dataLayer.push = (...entries: any[]) => {",
    "    entries.forEach(onPurchase);",
    "    return push(...entries);",
    "  };",
    "};",
    "",
  ].join("\n");

  const coverage = (field, status, source, value, confidence, note) => ({
    field,
    status,
    source,
    value,
    confidence,
    note,
  });

  const GENERATION = {
    at: NOW - 10 * 60_000,
    model: "anthropic/claude-sonnet-5",
    code: CODE,
    summary: "Hooks the data layer's purchase push on the thank-you page and sends the order as a transaction.",
    trigger: { kind: "dataLayer", description: "the “purchase” event pushed to dataLayer on the thank-you page" },
    fieldCoverage: [
      coverage("id", "mapped", "ecommerce.transaction_id", "T4821", "high", null),
      coverage("total", "mapped", "ecommerce.value", "84", "high", null),
      coverage("tax", "mapped", "ecommerce.tax", "6.72", "high", null),
      coverage("shipping", "mapped", "ecommerce.shipping", "0", "medium", null),
      coverage("currency", "mapped", "ecommerce.currency", "USD", "high", null),
      coverage("items", "derived", "ecommerce.items", null, "high", "one per line item"),
      coverage("city", "default", null, '""', "low", null),
      coverage("state", "default", null, '""', "low", null),
      coverage("country", "default", null, "US", "low", null),
    ],
    items: { trackable: true, reason: null },
    warnings: [],
    suggestedTarget: { kind: "domain", reason: "the data layer shape is this storefront's own" },
    dedupKey: "mj-shop-<transaction_id>",
    violations: [],
  };

  const ITEM = {
    orderId: "T4821",
    sku: "BD-35",
    name: "Blue Dream 3.5g",
    category: "",
    unitPrice: 42,
    quantity: 2,
    currency: "USD",
  };
  const CAPTURE_OK = {
    name: "trackTrans",
    at: NOW - 5 * 60_000,
    fromReplay: false,
    payload: {
      id: "T4821",
      total: 84,
      tax: 6.72,
      shipping: 0,
      city: "",
      state: "",
      country: "US",
      currency: "USD",
      items: [ITEM],
    },
  };
  const CAPTURE_BAD = {
    name: "trackTrans",
    at: NOW - 5 * 60_000,
    fromReplay: true,
    payload: {
      id: "",
      total: "84.00",
      tax: 6.72,
      shipping: 0,
      city: "",
      state: "",
      country: "US",
      currency: "USD",
      items: [],
    },
  };

  const REPO = "https://github.com/MediaJel/mediajel-frictionless-custom-tag";
  const DEPLOY = {
    at: NOW - 2 * 60_000,
    kind: "domain",
    path: `src/domains/${SITE}.ts`,
    commitUrl: `${REPO}/commit/9f3c2ab`,
    fileUrl: `${REPO}/blob/master/src/domains/${SITE}.ts`,
    update: false,
    cdnUrl: `https://custom-tags.cnna.io/domains/${btoa(SITE)}.js`,
  };

  const PROVEN = {
    generation: GENERATION,
    markedIds: ["ev_4"],
    evidenceMode: "pinpoint",
    verify: { captured: [CAPTURE_OK], errors: [] },
  };

  /** What each step adds to a bare session, so a scenario can start anywhere in the work order. */
  const AT_STEP = {
    home: { pages: [], timeline: [] },
    recording: { pages: [PAGE_1], timeline: TIMELINE.slice(0, 5) },
    review: {},
    generating: {},
    result: { generation: GENERATION, markedIds: ["ev_4"], evidenceMode: "pinpoint" },
    verify: PROVEN,
    deploy: PROVEN,
    done: { ...PROVEN, deploy: DEPLOY },
  };

  const sessionAt = (step, extra) => ({
    v: 1,
    id: "ses_e2e",
    goal: "transaction",
    step,
    startedAt: NOW - 42_000,
    pages: [PAGE_1, PAGE_2],
    timeline: TIMELINE,
    markedIds: [],
    notes: "",
    ...AT_STEP[step],
    ...extra,
  });

  // ---- the last 7 days ----------------------------------------------------------------------

  const DAYS = [
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
    "2026-09-12",
    "2026-09-13",
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
  ];
  const BY_DAY = {
    pageviews: [1700, 1840, 1910, 1650, 2020, 1760, 1380, 580],
    sessions: [560, 610, 640, 540, 690, 600, 470, 200],
    transactions: [12, 14, 15, 11, 17, 13, 9, 5],
    signups: [2, 1, 3, 2, 3, 1, 1, 1],
    transactionTotal: [980.5, 1210, 1305.25, 890, 1460.75, 1102, 760, 415],
  };
  const TOTALS = {
    pageviews: 12_840,
    sessions: 4310,
    transactions: 96,
    signups: 14,
    impressions: 0,
    transactionTotal: 8123.5,
  };
  const PAGE_LIST = [
    { pageUrl: `https://${SITE}/checkout/thank-you`, conversions: 71, transactionTotal: 6120.25 },
    { pageUrl: `https://${SITE}/account/welcome`, conversions: 14, transactionTotal: null },
    { pageUrl: "https://pay.example-checkout.com/return/:id", conversions: 11, transactionTotal: 2003.25 },
  ];

  /** Every count divided by `divisor`, so a second and third tag read as smaller sites. */
  const scaled = (counts, divisor) =>
    Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Math.round((value / divisor) * 100) / 100]));

  const dailyRows = (divisor) =>
    DAYS.map((day, index) => ({
      day,
      ...scaled(Object.fromEntries(Object.entries(BY_DAY).map(([key, values]) => [key, values[index]])), divisor),
    }));

  /** A count is whole; a total keeps its cents. Scaling by the tag's index must not print fractions. */
  const rounded = (record) =>
    Object.fromEntries(
      Object.entries(record).map(([key, value]) => [
        key,
        typeof value !== "number"
          ? value
          : key === "transactionTotal" || key === "total"
            ? Math.round(value * 100) / 100
            : Math.round(value),
      ]),
    );

  const okResult = (appId, index, spec) => ({
    appId,
    status: "ok",
    totals: rounded(spec.quiet ? scaled(TOTALS, Infinity) : scaled(TOTALS, index + 1)),
    lastTransactionAt: spec.quiet ? null : new Date(NOW - 2 * HOUR).toISOString(),
    lastSignUpAt: spec.quiet ? null : new Date(NOW - 26 * HOUR).toISOString(),
    pages: spec.quiet ? [] : PAGE_LIST,
    truncated: false,
    partial: false,
    daily: dailyFor(spec, index)?.map(rounded) ?? null,
  });

  const dailyFor = (spec, index) => {
    if (spec.daily === null) return null;
    return dailyRows(spec.quiet ? Infinity : index + 1);
  };

  const unavailable = (appId) => ({
    appId,
    status: "unavailable",
    message: "internal-service answered 502 for this app ID.",
  });

  const resultFor = (appId, index, spec) =>
    (spec.unavailable || []).includes(index) ? unavailable(appId) : okResult(appId, index, spec);

  const FAILURES = {
    error: { message: "The assistant service answered 502.", code: "http" },
    "not-configured": {
      message: "Tag activity isn’t set up on the assistant service yet.",
      code: "activity-not-configured",
    },
  };

  const failure = (kind) => Object.assign(new Error(FAILURES[kind].message), { code: FAILURES[kind].code });

  // ---- scenarios ----------------------------------------------------------------------------

  const JOBS = [
    { site: SITE, goal: "transaction", step: "result", events: 9, touchedAt: NOW - 12 * 60_000, deployed: false },
    {
      site: "greenleaf-dispensary.com",
      goal: "signup",
      step: "done",
      events: 23,
      touchedAt: NOW - 3 * HOUR,
      deployed: true,
    },
    {
      site: "www.riverbend-cannabis.com",
      goal: "transaction",
      step: "recording",
      events: 41,
      touchedAt: NOW - 50 * HOUR,
      deployed: false,
    },
  ];

  const MFA = { kind: "mfa", label: "Enter the code from your authenticator app." };

  /**
   * One entry per screen the matrix draws. `step` and `session` shape the job, `page` what the tab
   * carries, `activity` what the service answers, `hang` which requests never answer.
   */

  // ---- the simulated tag -----------------------------------------------------------------------

  /** A tag no page here runs: simulated beside the page's own, it stays silent. */
  const SILENT_APP = "e64cabc8-1336-429e-ba66-3b04d80c9777";
  const simulated = (appId, enabled = true, site = SITE) => ({
    v: 1,
    site,
    enabled,
    install: { url: tagSrc(appId), appId },
    tried: {},
    updatedAt: NOW - HOUR,
  });
  /** The block the assistant API renders for the tried edit — its own renderer's output, kept as a fixture. */
  const TRIED_BLOCK =
    ';/* mediajel-assistant:overrides 5f976cbb-7d29-46ce-bf07-0f701478d800 begin\n * The tag configuration for 5f976cbb-7d29-46ce-bf07-0f701478d800, edited in the MediaJel Integrations Assistant. It merges\n * into whatever this file and the domain file set in window.overrides, for this tag alone, and it\n * never throws. Change it in the assistant; to undo it, delete this block, markers included.\n */\n(function (appId, edits, version) {\n  try {\n    var tried = window["__mediajelAssistantOverrides"];\n    if (tried && tried[appId] && tried[appId] !== version) return;\n    var has = Object.prototype.hasOwnProperty;\n    var copy = function (from, into) {\n      for (var key in from) if (has.call(from, key)) into[key] = from[key];\n      return into;\n    };\n    var edited = function (base) {\n      return copy(edits, copy(base, {}));\n    };\n    var hide = function (holder, value) {\n      Object.defineProperty(holder, appId, { value: value, enumerable: false, configurable: true, writable: true });\n    };\n    var current = window.overrides;\n    if (Array.isArray(current)) {\n      for (var i = 0; i < current.length; i += 1) {\n        if (current[i] && (current[i].tag === appId || current[i].appId === appId)) {\n          current[i] = edited(current[i]);\n          return;\n        }\n      }\n      current.push(edited({ appId: appId }));\n      return;\n    }\n    if (current && typeof current === "object") {\n      if (current[appId] && typeof current[appId] === "object") {\n        current[appId] = edited(current[appId]);\n        return;\n      }\n      var flat = {};\n      for (var name in current) if (has.call(current, name) && typeof current[name] !== "object") flat[name] = current[name];\n      hide(current, edited(flat));\n      return;\n    }\n    var defaults = {};\n    var scripts = document.getElementsByTagName("script");\n    for (var s = 0; s < scripts.length; s += 1) {\n      var src = scripts[s].src || "";\n      var query = new URLSearchParams(src.substring(src.indexOf("?")));\n      if ((query.get("appId") || query.get("mediajelAppId")) === appId) {\n        if (!query.get("s3.pv")) defaults["s3.pv"] = "00000";\n        if (!query.get("s3.tr")) defaults["s3.tr"] = "00000";\n        break;\n      }\n    }\n    window.overrides = {};\n    hide(window.overrides, edited(defaults));\n  } catch (error) {\n    if (window.console) window.console.warn("[MediaJel] The assistant\'s overrides for " + appId + " were not applied:", error);\n  }\n})("5f976cbb-7d29-46ce-bf07-0f701478d800", {"environment":"jane","s3.pv":"Terrabis-Edited-PV"}, "v-9ba59ccd");\n/* mediajel-assistant:overrides 5f976cbb-7d29-46ce-bf07-0f701478d800 end */';
  const TRIED_AFTER =
    'const tag = () => {\n  window.overrides = {};\n};\n\ntag();\n\n;/* mediajel-assistant:overrides 5f976cbb-7d29-46ce-bf07-0f701478d800 begin\n * The tag configuration for 5f976cbb-7d29-46ce-bf07-0f701478d800, edited in the MediaJel Integrations Assistant. It merges\n * into whatever this file and the domain file set in window.overrides, for this tag alone, and it\n * never throws. Change it in the assistant; to undo it, delete this block, markers included.\n */\n(function (appId, edits, version) {\n  try {\n    var tried = window["__mediajelAssistantOverrides"];\n    if (tried && tried[appId] && tried[appId] !== version) return;\n    var has = Object.prototype.hasOwnProperty;\n    var copy = function (from, into) {\n      for (var key in from) if (has.call(from, key)) into[key] = from[key];\n      return into;\n    };\n    var edited = function (base) {\n      return copy(edits, copy(base, {}));\n    };\n    var hide = function (holder, value) {\n      Object.defineProperty(holder, appId, { value: value, enumerable: false, configurable: true, writable: true });\n    };\n    var current = window.overrides;\n    if (Array.isArray(current)) {\n      for (var i = 0; i < current.length; i += 1) {\n        if (current[i] && (current[i].tag === appId || current[i].appId === appId)) {\n          current[i] = edited(current[i]);\n          return;\n        }\n      }\n      current.push(edited({ appId: appId }));\n      return;\n    }\n    if (current && typeof current === "object") {\n      if (current[appId] && typeof current[appId] === "object") {\n        current[appId] = edited(current[appId]);\n        return;\n      }\n      var flat = {};\n      for (var name in current) if (has.call(current, name) && typeof current[name] !== "object") flat[name] = current[name];\n      hide(current, edited(flat));\n      return;\n    }\n    var defaults = {};\n    var scripts = document.getElementsByTagName("script");\n    for (var s = 0; s < scripts.length; s += 1) {\n      var src = scripts[s].src || "";\n      var query = new URLSearchParams(src.substring(src.indexOf("?")));\n      if ((query.get("appId") || query.get("mediajelAppId")) === appId) {\n        if (!query.get("s3.pv")) defaults["s3.pv"] = "00000";\n        if (!query.get("s3.tr")) defaults["s3.tr"] = "00000";\n        break;\n      }\n    }\n    window.overrides = {};\n    hide(window.overrides, edited(defaults));\n  } catch (error) {\n    if (window.console) window.console.warn("[MediaJel] The assistant\'s overrides for " + appId + " were not applied:", error);\n  }\n})("5f976cbb-7d29-46ce-bf07-0f701478d800", {"environment":"jane","s3.pv":"Terrabis-Edited-PV"}, "v-9ba59ccd");\n/* mediajel-assistant:overrides 5f976cbb-7d29-46ce-bf07-0f701478d800 end */\n';
  const triedEdit = { edits: TRIED_EDITS, block: TRIED_BLOCK, version: "v-9ba59ccd" };
  const trying = {
    v: 1,
    site: SITE,
    enabled: true,
    install: null,
    tried: { [APP_IDS[0]]: triedEdit },
    updatedAt: NOW - HOUR,
  };
  const deployedEdit = {
    ...trying,
    tried: {
      [APP_IDS[0]]: {
        ...triedEdit,
        deployed: {
          commitUrl: "https://github.com/MediaJel/mediajel-frictionless-custom-tag/commit/9f3e2c1",
          fileUrl: "https://github.com/MediaJel/mediajel-frictionless-custom-tag/blob/master/src/app-ids/x.ts",
          at: NOW - 60_000,
        },
      },
    },
  };
  const SIMULATIONS = {
    running: simulated(APP_IDS[0]),
    paused: simulated(APP_IDS[0], false),
    silent: simulated(SILENT_APP),
    trying,
    deployed: deployedEdit,
  };
  const PAGE_REPORTS = { late: { installFailed: false, late: [APP_IDS[0]] } };
  const simulationRead = () => ({
    simulation: SIMULATIONS[scenario.simulation] || null,
    page: PAGE_REPORTS[scenario.simulationPage] || null,
  });
  /** What an edit would do to the tag's app-id file — this one carries no earlier edit, unless the scenario says so. */
  const overridesPreview = (request) => ({
    path: `src/app-ids/${request.appId}.ts`,
    exists: true,
    sha: "3f1c2e9",
    before: "const tag = () => {\n  window.overrides = {};\n};\n\ntag();\n",
    after: TRIED_AFTER,
    block: TRIED_BLOCK,
    version: triedEdit.version,
    deployed: scenario.deployed || null,
    changed: true,
  });

  // ---- the ledger ----------------------------------------------------------------------------

  const CHECKOUT = `https://${SITE}/checkout`;
  const THANKS = `https://${SITE}/checkout/thank-you?order=T4821`;
  const fieldGroup = (group, label, fields) => ({
    group,
    label,
    fields: fields.map(([key, name, value]) => ({ key, label: name, value })),
  });
  const eventFields = (code) =>
    fieldGroup("event", "Event", [
      ["e", "Event type", code],
      ["eid", "Event ID", "43aa4792-d2e4-4a3f-bf0a-46bd1744c9ca"],
      ["dtm", "Created (device clock)", String(NOW - 50_000)],
      ["stm", "Sent (device clock)", String(NOW - 49_999)],
    ]);
  const APP_FIELDS = fieldGroup("app", "App", [
    ["p", "Platform", "web"],
    ["tna", "Tracker name", APP_IDS[0]],
    ["tv", "Tracker version", "js-3.22.1"],
    ["aid", "App ID", APP_IDS[0]],
  ]);
  const USER_FIELDS = fieldGroup("user", "User", [
    ["duid", "Domain user ID", "8f206e2f-6654-49f8-954f-dd31c858f933"],
    ["nuid", "Network user ID", "1ea2deb3-c767-4847-ba04-eb27b8e83c50"],
  ]);
  const SESSION_FIELDS = fieldGroup("session", "Session", [
    ["sid", "Session ID", "171f21ce-401e-4a54-afb8-01c265f16cbf"],
    ["vid", "Visit number", "10"],
  ]);
  const pageFields = (url, title) =>
    fieldGroup("page", "Page", [
      ["url", "Page URL", url],
      ["page", "Page title", title],
      ["ds", "Document size", "700x6811"],
      ["cs", "Charset", "UTF-8"],
    ]);
  const BROWSER_FIELDS = fieldGroup("browser", "Browser", [
    ["ua", "User agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/153.0.0.0"],
    ["cookie", "Cookies enabled", "1"],
    ["lang", "Language", "en-US"],
    ["vp", "Viewport", "714x1163"],
  ]);
  const DEVICE_FIELDS = fieldGroup("device", "Device", [
    ["tz", "Timezone", "Asia/Manila"],
    ["res", "Screen resolution", "1728x1117"],
    ["cd", "Colour depth", "30"],
  ]);
  const PING_FIELDS = fieldGroup("ping", "Ping", [
    ["pp_mix", "Scroll min X", "0"],
    ["pp_max", "Scroll max X", "0"],
    ["pp_miy", "Scroll min Y", "0"],
    ["pp_may", "Scroll max Y", "370"],
  ]);
  const TRANSACTION_FIELDS = fieldGroup("transaction", "Transaction", [
    ["tr_id", "Order ID", "T4821"],
    ["tr_af", "Affiliation", APP_IDS[0]],
    ["tr_tt", "Total", "84"],
    ["tr_tx", "Tax", "6.72"],
    ["tr_sh", "Shipping", "0"],
    ["tr_cu", "Currency", "USD"],
  ]);
  const itemFields = (sku, name, price, quantity) =>
    fieldGroup("item", "Item", [
      ["ti_id", "Order ID", "T4821"],
      ["ti_sk", "SKU", sku],
      ["ti_nm", "Name", name],
      ["ti_pr", "Unit price", price],
      ["ti_qu", "Quantity", quantity],
      ["ti_cu", "Currency", "USD"],
    ]);
  const WEB_PAGE = {
    schema: "iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0",
    vendor: "com.snowplowanalytics.snowplow",
    name: "web_page",
    version: "1-0-0",
    data: JSON.stringify({ id: "1a6e7de8-86f6-497b-aca3-03c1255ad642" }),
    truncated: false,
  };
  const common = (code, url, title) => [
    eventFields(code),
    APP_FIELDS,
    USER_FIELDS,
    SESSION_FIELDS,
    pageFields(url, title),
    BROWSER_FIELDS,
    DEVICE_FIELDS,
  ];
  const RECORD_CONFIG = configOf(APP_IDS[0]);
  const signal = (seq, pageKey, pageUrl, overrides) => ({
    id: `r${seq}:0`,
    seq,
    at: NOW - 60_000 + seq * 3_000,
    request: `r${seq}`,
    pageKey,
    pageUrl,
    appId: "",
    outcome: { kind: "ok", status: 200, fromCache: false },
    ...overrides,
  });
  const collector = (seq, pageKey, pageUrl, overrides) =>
    signal(seq, pageKey, pageUrl, {
      appId: APP_IDS[0],
      source: "collector",
      transport: "post",
      collector: COLLECTOR,
      kind: "page-view",
      code: "pv",
      name: "Page view",
      groups: [],
      entities: [WEB_PAGE],
      batch: { index: 0, size: 1 },
      ...overrides,
    });
  const partner = (seq, pageKey, pageUrl, overrides) =>
    signal(seq, pageKey, pageUrl, { source: "partner", unconfigured: false, companion: false, ...overrides });
  /** Two pages of a checkout, newest first: the thank-you page and everything the purchase fired, then the checkout's boot. */
  const WIRE = [
    collector(16, "doc-2", THANKS, {
      kind: "page-ping",
      code: "pp",
      name: "Page ping",
      groups: [PING_FIELDS, ...common("pp", THANKS, "Thank you")],
      outcome: { kind: "blocked", error: "net::ERR_BLOCKED_BY_CLIENT" },
    }),
    signal(15, "doc-2", THANKS, {
      source: "third-party",
      phase: "fired",
      trigger: "onTransaction",
      element: "image",
      host: "www.googletagmanager.com",
      url: "https://www.googletagmanager.com/gtag/conversion?id=AW-17979043318&value=84&currency=USD",
    }),
    partner(14, "doc-2", THANKS, {
      partner: "dstillery",
      purpose: "conversion",
      segment: "TerrabisMundelein-S3.TR",
      order: { id: "T4821", amount: "84" },
      url: "https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=TerrabisMundelein-S3.TR&ncv=76&dstOrderId=T4821&dstOrderAmount=84",
    }),
    partner(13, "doc-2", THANKS, {
      partner: "nexxen",
      purpose: "conversion",
      segment: "bVey-3fRZmk1",
      order: { id: "T4821", amount: "84" },
      url: "https://r.turn.com/r/beacon?b2=bVey-3fRZmk1&cid=T4821&bprice=84",
    }),
    collector(12, "doc-2", THANKS, {
      kind: "transaction-item",
      code: "ti",
      name: "Item",
      groups: [itemFields("PR-1", "Pre-roll 1g", "10", "2"), ...common("ti", THANKS, "Thank you")],
      batch: { index: 2, size: 3 },
    }),
    collector(11, "doc-2", THANKS, {
      kind: "transaction-item",
      code: "ti",
      name: "Item",
      groups: [itemFields("BD-35", "Blue Dream 3.5g", "42", "2"), ...common("ti", THANKS, "Thank you")],
      batch: { index: 1, size: 3 },
    }),
    collector(10, "doc-2", THANKS, {
      kind: "transaction",
      code: "tr",
      name: "Transaction",
      groups: [TRANSACTION_FIELDS, ...common("tr", THANKS, "Thank you")],
      batch: { index: 0, size: 3 },
    }),
    collector(9, "doc-2", THANKS, { groups: common("pv", THANKS, "Thank you") }),
    signal(8, "doc-1", CHECKOUT, {
      source: "third-party",
      phase: "registered",
      triggers: [{ trigger: "onTransaction", count: 1, hosts: ["www.googletagmanager.com"] }],
    }),
    collector(7, "doc-1", CHECKOUT, {
      kind: "page-ping",
      code: "pp",
      name: "Page ping",
      groups: [PING_FIELDS, ...common("pp", CHECKOUT, "Checkout")],
    }),
    signal(6, "doc-1", CHECKOUT, {
      source: "foreign",
      collector: "col.surfside.io",
      kind: "self-describing",
      code: "ue",
      tracker: "surf",
      version: "js-3.24.2",
    }),
    partner(5, "doc-1", CHECKOUT, {
      partner: "liquidm",
      purpose: "sync",
      segment: "bLeKCx2Vm0S5qAaJ7dE1fw",
      url: "https://tracking.lqm.io/odin/handle_sync.js?seg=bLeKCx2Vm0S5qAaJ7dE1fw&gdpr=0&gdpr_consent=&cb=1789759557364",
    }),
    partner(4, "doc-1", CHECKOUT, {
      partner: "dstillery",
      purpose: "audience",
      segment: "00000",
      unconfigured: true,
      url: "https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=00000&ncv=76",
    }),
    collector(3, "doc-1", CHECKOUT, {
      kind: "self-describing",
      code: "ue",
      name: "record",
      schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
      payload: JSON.stringify({
        appId: APP_IDS[0],
        version: "2",
        environment: "production",
        collector: `//${COLLECTOR}`,
        ...RECORD_CONFIG.params,
        tag: RECORD_CONFIG.element,
      }),
      record: {
        appId: APP_IDS[0],
        environment: "production",
        version: "2",
        event: "",
        collector: COLLECTOR,
        config: RECORD_CONFIG,
      },
      groups: common("ue", CHECKOUT, "Checkout"),
    }),
    signal(2, "doc-1", CHECKOUT, {
      source: "custom-tag",
      scope: "domain",
      name: SITE,
      url: `https://test-custom-tags.cnna.io/domains/${btoa(SITE)}.js`,
    }),
    collector(1, "doc-1", CHECKOUT, { groups: common("pv", CHECKOUT, "Checkout") }),
  ];
  const LEDGER_PAGES = [
    { key: "doc-2", url: THANKS, at: NOW - 33_000 },
    { key: "doc-1", url: CHECKOUT, at: NOW - 57_000 },
  ];
  const LEDGERS = {
    empty: { site: SITE, events: [], pages: [], dropped: 0, seq: 0 },
    live: { site: SITE, events: WIRE, pages: LEDGER_PAGES, dropped: 0, seq: 16 },
    // Past the cap the newest few remain and the line under them says how many were let go — short
    // enough that the line is in the picture.
    dropped: { site: SITE, events: WIRE.slice(0, 3), pages: [LEDGER_PAGES[0]], dropped: 312, seq: 328 },
  };
  const readLedger = () => {
    if (scenario.events === "error")
      throw new Error("The assistant running in this browser is older than the panel and keeps no ledger.");
    return LEDGERS[scenario.events || "empty"];
  };

  const SCENARIOS = {
    loading: { hang: ["auth/session", "settings/read"] },
    "sign-in": { signedIn: false },
    "sign-in-challenge": { signedIn: false, challenge: MFA },
    "no-site": { noSite: true },
    "jobs-empty": { step: "home", jobs: [] },
    "jobs-3": { step: "home", jobs: JOBS },
    "job-home": { step: "home" },
    "job-recording": { step: "recording" },
    "job-review-suggest": { step: "review" },
    "job-review-pinpoint": { step: "review", session: { evidenceMode: "pinpoint", markedIds: ["ev_4"] } },
    "job-generating": { step: "generating" },
    "job-result": { step: "result" },
    "job-verify-waiting": { step: "verify", session: { verify: { captured: [], errors: [] } } },
    "job-verify-ok": { step: "verify" },
    "job-verify-problems": { step: "verify", session: { verify: { captured: [CAPTURE_BAD], errors: [] } } },
    "job-deploy": { step: "deploy" },
    "job-done": { step: "done" },
    settings: {
      step: "home",
      simulations: [simulated(APP_IDS[0]), simulated("5b677990-d3a8-49eb-9d18-15d686ad6e1a", false, "unity-rd.com")],
    },
    "confirm-reset": { step: "result" },
    "overview-listening": { step: "home", page: "silent" },
    "overview-no-tags": { step: "home", page: "no-tags" },
    "overview-loading": { step: "home", hang: ["service/tag-activity"] },
    "overview-error": { step: "home", activity: { fail: "error" } },
    "overview-not-configured": { step: "home", activity: { fail: "not-configured" } },
    "overview-4-tags": { step: "home", page: "four" },
    "overview-refreshing": { step: "home", page: "two", activity: { unavailable: [1], hangAfterCalls: 1 } },
    "overview-quiet-week": { step: "home", activity: { quiet: true } },
    "overview-config": { step: "home" },
    "overview-simulate": { step: "home" },
    "overview-simulate-url": { step: "home" },
    "overview-simulate-object": { step: "home" },
    "overview-simulate-refused": { step: "home" },
    "overview-simulating": { step: "home", simulation: "running" },
    "overview-simulating-paused": { step: "home", simulation: "paused" },
    "overview-simulating-silent": { step: "home", simulation: "silent" },
    "overview-config-edit": { step: "home" },
    "overview-config-edit-deployed": { step: "home", deployed: { "s2.pv": "Deployed-Nexxen" } },
    "overview-config-object": { step: "home" },
    "overview-config-trying": { step: "home", page: "tried", simulation: "trying" },
    "overview-config-late": { step: "home", page: "tried", simulation: "trying", simulationPage: "late" },
    "overview-config-deploy": { step: "home", page: "tried", simulation: "trying" },
    "overview-config-deployed": { step: "home", page: "tried", simulation: "deployed" },
    "config-script-only": { step: "home", page: "script" },
    "events-empty": { step: "home", events: "empty" },
    "events-live": { step: "home", events: "live" },
    "events-detail": { step: "home", events: "live" },
    "events-wide": { step: "home", events: "live" },
    "events-wide-detail": { step: "home", events: "live" },
    "events-wide-pageview": { step: "home", events: "live" },
    "events-dropped": { step: "home", events: "dropped" },
    "events-error": { step: "home", events: "error" },
    "events-partners": { step: "home", events: "live" },
    "events-custom-tag": { step: "home", events: "live" },
    "events-foreign": { step: "home", events: "live" },
    "events-two-tags": { step: "home", page: "two", events: "live" },
    "analytics-1": { step: "home" },
    "analytics-3": { step: "home", page: "three", activity: { unavailable: [1] } },
    "analytics-daily-null": { step: "home", activity: { daily: null } },
    "analytics-listening": { step: "home", page: "silent" },
    "analytics-no-tags": { step: "home", page: "no-tags" },
    "analytics-error": { step: "home", activity: { fail: "error" } },
    "analytics-not-configured": { step: "home", activity: { fail: "not-configured" } },
    "popup-out": { signedIn: false },
    "popup-in": {},
  };

  const unknownScenario = (name) => {
    console.error(`[chrome-stub] unknown scenario "${name}"; showing job-home`);
    return SCENARIOS["job-home"];
  };

  const scenario = SCENARIOS[scenarioName] || unknownScenario(scenarioName);
  const page = PAGES[scenario.page || "one"];

  const state = {
    signedIn: scenario.signedIn !== false,
    settings: { theme, acknowledgedDataSharing: true, lastInjectedTagUrl: "" },
    session: sessionAt(scenario.step || "home", scenario.session || {}),
    activityCalls: 0,
  };

  // ---- the port, and what is pushed through it ---------------------------------------------

  const ports = new Set();

  const listenerList = () => {
    const listeners = new Set();
    return { addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn), listeners };
  };

  const makePort = (name) => {
    const onMessage = listenerList();
    const port = {
      name,
      onMessage,
      onDisconnect: listenerList(),
      postMessage: () => undefined,
      disconnect: () => ports.delete(port),
      deliver: (message) => onMessage.listeners.forEach((fn) => fn(message)),
    };
    ports.add(port);
    return port;
  };

  /** What the background pushes at a bound panel — a tick later, as a real port would. */
  const push = (message) => setTimeout(() => ports.forEach((port) => port.deliver(message)), 0);

  const setSession = (session) => {
    state.session = session;
    push({ type: "session", session });
  };

  const later = (ms, work) => setTimeout(work, ms);

  // ---- the answers --------------------------------------------------------------------------

  const HANG = Symbol("hang");
  const NEVER = new Promise(() => undefined);

  const authState = (challenge) => ({ identity: state.signedIn ? IDENTITY : null, challenge: challenge || null });

  const view = () => ({
    site: SITE,
    session: state.session,
    status: statusFor(page.tags, page.settled),
    tags: page.tags,
    settled: page.settled,
  });

  const toggled = (ids, id) => (ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]);

  const PATCHES = {
    "toggle-mark": (session, patch) => ({ ...session, markedIds: toggled(session.markedIds, patch.id) }),
    "clear-marks": (session) => ({ ...session, markedIds: [], evidenceMode: "pinpoint" }),
    notes: (session, patch) => ({ ...session, notes: patch.notes }),
    "evidence-mode": (session, patch) => ({ ...session, evidenceMode: patch.mode }),
    code: (session, patch) => ({ ...session, generation: { ...session.generation, code: patch.code, edited: true } }),
  };

  const signIn = () => {
    if (scenario.challenge) return authState(scenario.challenge);
    state.signedIn = true;
    return authState();
  };

  const shouldHang = (spec) => Boolean(spec.hangAfterCalls) && state.activityCalls > spec.hangAfterCalls;

  const tagActivity = (appIds) => {
    const spec = scenario.activity || {};
    state.activityCalls += 1;
    if (spec.fail) throw failure(spec.fail);
    if (shouldHang(spec)) return HANG;
    return { days: 7, tags: appIds.map((appId, index) => resultFor(appId, index, spec)) };
  };

  const stepTo = (step, extra) => {
    setSession({ ...state.session, step, ...extra });
    return step;
  };

  const restart = (step, goal) => {
    setSession(sessionAt(step, { goal: goal || state.session.goal }));
    return step;
  };

  const verify = () => {
    later(800, () => {
      setSession({ ...state.session, verify: { captured: [CAPTURE_OK], errors: [] } });
      push({ type: "verify-result", ok: true, errors: [] });
    });
    return null;
  };

  const generate = () => {
    stepTo("generating");
    later(1500, () => restart("result", state.session.goal));
    return null;
  };

  const existingTag = (kind) =>
    kind === "domain"
      ? { exists: false }
      : { exists: true, sha: "9f3c2ab7e1d4c6b8a0f2e4d6c8b0a2f4e6d8c0b2", content: `${CODE.slice(0, 160)}…` };

  const deploy = (kind) => {
    stepTo("done", { deploy: { ...DEPLOY, kind } });
    return { commitUrl: DEPLOY.commitUrl, fileUrl: DEPLOY.fileUrl, path: DEPLOY.path, update: false };
  };

  const HANDLERS = {
    "auth/session": () => authState(),
    "auth/sign-in": signIn,
    "auth/answer": () => {
      state.signedIn = true;
      return authState();
    },
    "auth/sign-out": () => {
      state.signedIn = false;
      return authState();
    },
    "auth/check-access": () => "gpt-4.1 · signed in as j.doe",
    "settings/read": () => state.settings,
    "settings/write": (request) => Object.assign(state.settings, request.patch),
    "job/open": () => (scenario.noSite ? null : view()),
    "job/list": () => scenario.jobs || [],
    "job/delete": () => null,
    "job/clear-all": () => null,
    "job/reset": (request) => {
      restart("home", request.goal);
      return view();
    },
    "job/advance": (request) => stepTo(request.to),
    "job/patch": (request) => {
      setSession(PATCHES[request.patch.op](state.session, request.patch));
      return state.session;
    },
    "page/start-recording": (request) => restart("recording", request.goal),
    "page/stop-recording": () => stepTo("review"),
    "page/verify": verify,
    "page/clear-dedup": () => {
      push({ type: "dedup-cleared", count: 3 });
      return null;
    },
    "service/generate": generate,
    "service/cancel-generate": () => {
      stepTo("review");
      return null;
    },
    "service/existing-tag": (request) => existingTag(request.kind),
    "service/deploy": (request) => deploy(request.kind),
    "service/tag-activity": (request) => tagActivity(request.appIds),
    // The ledger is what the scenario says; the stub never pushes events, so a picture holds still.
    "events/read": () => readLedger(),
    "events/clear": () => null,
    // The simulated tag is what the scenario says; the stub keeps nothing, so a click changes no picture.
    "simulation/read": () => simulationRead(),
    "simulation/install": () => simulationRead(),
    "simulation/pause": () => simulationRead(),
    "simulation/remove": () => [],
    "simulation/list": () => scenario.simulations || [],
    "simulation/try": () => simulationRead(),
    "simulation/stop": () => simulationRead(),
    "simulation/deploy": () => ({
      view: simulationRead(),
      outcome: { commitUrl: deployedEdit.tried[APP_IDS[0]].deployed.commitUrl, fileUrl: "", path: "", update: true },
    }),
    "simulation/reload": () => null,
    "service/overrides-preview": (request) => overridesPreview(request),
  };

  const settled = (value) => (value === HANG ? NEVER : { ok: true, value });
  const failed = (err) => ({ ok: false, error: err.message, code: err.code });

  const answer = (request) => {
    const handler = HANDLERS[request.type];
    if (!handler) return Promise.resolve({ ok: false, error: `The stub does not know "${request.type}".` });
    if ((scenario.hang || []).includes(request.type)) return NEVER;
    return Promise.resolve()
      .then(() => handler(request))
      .then(settled, failed);
  };

  // ---- storage and the rest of the surface --------------------------------------------------

  const keysOf = (store, keys) => {
    if (keys === undefined || keys === null) return [...store.keys()];
    if (typeof keys === "string") return [keys];
    return Array.isArray(keys) ? keys : Object.keys(keys);
  };

  const area = () => {
    const store = new Map();
    return {
      get: async (keys) =>
        Object.fromEntries(
          keysOf(store, keys)
            .filter((key) => store.has(key))
            .map((key) => [key, store.get(key)]),
        ),
      set: async (items) => Object.entries(items).forEach(([key, value]) => store.set(key, value)),
      remove: async (keys) => keysOf(store, keys).forEach((key) => store.delete(key)),
      clear: async () => store.clear(),
    };
  };

  const NOOP_EVENT = { addListener: () => undefined, removeListener: () => undefined, hasListener: () => false };

  window.chrome = {
    runtime: {
      id: "mj-e2e-stub",
      lastError: undefined,
      sendMessage: answer,
      connect: ({ name }) => makePort(name),
      getURL: (file) => new URL(file, location.origin).href,
      onMessage: NOOP_EVENT,
      onConnect: NOOP_EVENT,
    },
    tabs: {
      query: async () => [TAB],
      get: async () => TAB,
      update: async () => TAB,
      onActivated: NOOP_EVENT,
      onUpdated: NOOP_EVENT,
      onRemoved: NOOP_EVENT,
    },
    storage: { local: area(), session: area(), sync: area(), onChanged: NOOP_EVENT },
    sidePanel: { open: async () => undefined, setPanelBehavior: async () => undefined },
    scripting: { registerContentScripts: async () => undefined, executeScript: async () => [] },
    webRequest: { onBeforeRequest: NOOP_EVENT, onCompleted: NOOP_EVENT, onErrorOccurred: NOOP_EVENT },
  };
})();
