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
    lastHeardAt: NOW - 30_000 + index * 1_000,
  });
  const NO_TAG =
    "No MediaJel tag has spoken up on this page. You can still record and generate; Verify needs the tag, so load it first.";

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
  const scriptTag = (appId, index) => ({
    ...tagOf(appId, index),
    state: "installed",
    collector: "",
    lastHeardAt: null,
    config: {
      params: { segmentId: "e-oqTEY2SNGlRzvmH9esjw", s3: "S3-legacy" },
      src: tagSrc(appId),
      element: `<script src="${tagSrc(appId)}"></script>`,
      source: "script",
    },
  });

  const PAGES = {
    one: { tags: APP_IDS.slice(0, 1).map(tagOf), settled: true },
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

  const okResult = (appId, index, spec) => ({
    appId,
    status: "ok",
    totals: spec.quiet ? scaled(TOTALS, Infinity) : scaled(TOTALS, index + 1),
    lastTransactionAt: spec.quiet ? null : new Date(NOW - 2 * HOUR).toISOString(),
    lastSignUpAt: spec.quiet ? null : new Date(NOW - 26 * HOUR).toISOString(),
    pages: spec.quiet ? [] : PAGE_LIST,
    truncated: false,
    partial: false,
    daily: dailyFor(spec, index),
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
    settings: { step: "home" },
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
    "config-script-only": { step: "home", page: "script" },
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
    "page/inject-tag": () => null,
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
    // The ledger is empty until the Events view arrives with its fixture; the stub never pushes events.
    "events/read": () => ({ site: SITE, events: [], pages: [], dropped: 0, seq: 0 }),
    "events/clear": () => null,
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
