import {
  Check,
  Lesson,
  MicroBundle,
  SandboxContext,
  Section,
  findSelfDescribing,
  noBadEvents,
  unstructData,
} from "./lib/core";

/* ------------------------------------------------------------------ sandbox builders */

export const consoleBridge = `
['log','info','warn','error'].forEach(function(l){
  var o=console[l]?console[l].bind(console):function(){};
  console[l]=function(){
    try{
      var a=[].slice.call(arguments);
      var ser=function(x){ return (typeof x==='object'&&x!==null)?JSON.stringify(x,null,2):String(x); };
      var text='', css='';
      if (typeof a[0]==='string' && a[0].indexOf('%c')!==-1){
        // console.log("%c<msg>", "<css>") — keep the css so the inspector can render the colored badge.
        text=a[0].replace(/%c/g,'');
        css=(typeof a[1]==='string')?a[1]:'';
        var extra=a.slice(2).map(ser);
        if (extra.length) text+=' '+extra.join(' ');
      } else {
        text=a.map(ser).join(' ');
      }
      parent.postMessage({__mj:'log',level:l,text:text,css:css},'*');
    }catch(e){}
    o.apply(null,arguments);
  };
});
window.addEventListener('error',function(e){ try{parent.postMessage({__mj:'error',error:e.message},'*');}catch(_){} });`;

/** Loads the real tag (pointed at our Micro proxy) then runs the learner's JS once it's ready. */
function jsSandbox(
  code: string,
  ctx: SandboxContext,
  environment = "training",
  readyExpr = "typeof window.trackTrans==='function'",
): string {
  const tag = ctx.tagUrl({ appId: ctx.appId, environment, version: "2" });
  const overrides = JSON.stringify({ [ctx.appId]: { collector: "//" + ctx.host } });
  // <base> is essential: in an about:srcdoc iframe document.baseURI is "about:srcdoc", so the
  // tag's RELATIVE code-split chunk URLs (e.g. "adapters.xxxx.js") would resolve to a bogus base
  // and come back undefined. Anchoring the base to the real origin makes Parcel load chunks correctly.
  // Pre-create window.dataLayer BEFORE the tag loads so the tracker's datalayerSource patches the
  // real array the learner pushes to (lesson 5) — otherwise a later `window.dataLayer = ... || []`
  // reassignment orphans the patched push.
  return `<!doctype html><html><head><base href="${ctx.origin}/"><meta charset="utf-8">
<script>window.overrides=${overrides};window.dataLayer=window.dataLayer||[];${consoleBridge}</script>
<script src="${tag}"></script>
</head><body>
<script>
(function(){
  function ready(){ return ${readyExpr}; }
  function run(){
    setTimeout(function(){
      try { ${code}
      } catch(err){ parent.postMessage({__mj:'error',error:String(err&&err.message||err)},'*'); }
      setTimeout(function(){ parent.postMessage({__mj:'done'},'*'); }, 1400);
    }, 450);
  }
  var n=0,iv=setInterval(function(){ if(ready()){clearInterval(iv);run();} else if(++n>220){clearInterval(iv);run();} },50);
})();
</script>
</body></html>`;
}

/**
 * Frictionless-tag sandbox: a simulated client site with a contact form. The learner's per-domain
 * custom tag hooks the form; after it runs we simulate a user submitting so the tag fires.
 */
function frictionlessSandbox(code: string, ctx: SandboxContext): string {
  const tag = ctx.tagUrl({ appId: ctx.appId, environment: "training", version: "2" });
  const overrides = JSON.stringify({ [ctx.appId]: { collector: "//" + ctx.host } });
  return `<!doctype html><html><head><base href="${ctx.origin}/"><meta charset="utf-8">
<script>window.overrides=${overrides};window.dataLayer=window.dataLayer||[];${consoleBridge}</script>
<script src="${tag}"></script>
</head><body>
<form id="contact-form">
  <input class="field-name" data-name="your-name" value="Ada Lovelace" />
  <input class="field-email" data-name="your-email" value="ada@example.com" />
  <button type="button" class="submit-btn">Send</button>
</form>
<script>
(function(){
  function ready(){ return typeof window.tracker==='function'; }
  function run(){
    setTimeout(function(){
      try { ${code} } catch(err){ parent.postMessage({__mj:'error',error:String(err&&err.message||err)},'*'); }
      // simulate the visitor submitting the form so the learner's custom tag fires
      setTimeout(function(){
        var btn=document.querySelector('.submit-btn'); if(btn) btn.click();
        setTimeout(function(){ parent.postMessage({__mj:'done'},'*'); }, 1500);
      }, 600);
    }, 450);
  }
  var n=0,iv=setInterval(function(){ if(ready()){clearInterval(iv);run();} else if(++n>220){clearInterval(iv);run();} },50);
})();
</script>
</body></html>`;
}

/** Lesson 1: the learner writes an HTML <script> tag; we load the local tag with their appId. */
function htmlSandbox(code: string, ctx: SandboxContext): { srcdoc: string; appId: string } {
  const m = code.match(/[?&]app[iI]d=([^"'&\s>]+)/) || code.match(/mediajelAppId=([^"'&\s>]+)/);
  const appId = m ? decodeURIComponent(m[1]) : "";
  const tag = ctx.tagUrl({ appId: appId || "missing", environment: "training", version: "2" });
  const overrides = JSON.stringify({ [appId || "missing"]: { collector: "//" + ctx.host } });
  const srcdoc = `<!doctype html><html><head><base href="${ctx.origin}/"><meta charset="utf-8">
<script>window.overrides=${overrides};${consoleBridge}</script>
${appId ? `<script src="${tag}"></script>` : "<!-- no appId found in your tag -->"}
</head><body>
<script>setTimeout(function(){parent.postMessage({__mj:'done'},'*');},2600);</script>
</body></html>`;
  return { srcdoc, appId };
}

/**
 * "Listen" sandbox for the auto-capture lessons (dataLayer / network / iframe). Loads the tag in
 * `environment=exercise`, which EXPOSES the data sources on `window` but auto-captures nothing — so
 * the learner writes the listener themselves. The site emits the signal: `seedJs` runs before the
 * tag (e.g. pre-populates window.dataLayer, which `datalayerSource` replays on subscribe), and
 * `emitJs` runs just AFTER the learner's listener is attached (e.g. fires the XHR / postMessage).
 * The learner debugs by logging inside their callback; nothing reaches Micro unless they forward it.
 */
function listenSandbox(
  code: string,
  ctx: SandboxContext,
  opts: { readyExpr: string; seedJs?: string; emitJs?: string },
): string {
  const tag = ctx.tagUrl({ appId: ctx.appId, environment: "exercise", version: "2" });
  const overrides = JSON.stringify({ [ctx.appId]: { collector: "//" + ctx.host } });
  return `<!doctype html><html><head><base href="${ctx.origin}/"><meta charset="utf-8">
<script>window.overrides=${overrides};window.dataLayer=window.dataLayer||[];${opts.seedJs || ""}${consoleBridge}</script>
<script src="${tag}"></script>
</head><body>
<script>
(function(){
  function ready(){ return ${opts.readyExpr}; }
  function run(){
    setTimeout(function(){
      try { ${code} } catch(err){ parent.postMessage({__mj:'error',error:String(err&&err.message||err)},'*'); }
      setTimeout(function(){
        try { ${opts.emitJs || ""} } catch(e){ parent.postMessage({__mj:'error',error:String(e&&e.message||e)},'*'); }
        setTimeout(function(){ parent.postMessage({__mj:'done'},'*'); }, 1600);
      }, 350);
    }, 450);
  }
  var n=0,iv=setInterval(function(){ if(ready()){clearInterval(iv);run();} else if(++n>240){clearInterval(iv);run();} },50);
})();
</script>
</body></html>`;
}

// Signals the simulated site emits for the "listen" lessons (ES5 strings, run raw in the iframe).
// dataLayer: seeded BEFORE the tag so window.dataLayer is populated and datalayerSource replays it.
const DL_SEED = `
window.dataLayer.push({ event: "view_item", ecommerce: { currency: "USD", items: [{ item_id: "GA-1", item_name: "Gummies", item_category: "edibles", price: 42.0, quantity: 1 }] } });
window.dataLayer.push({ event: "purchase", ecommerce: { transaction_id: "DL-5500", value: 84.0, tax: 6.0, shipping: 0, currency: "USD", items: [{ item_id: "GA-1", item_name: "Gummies", item_category: "edibles", price: 42.0, quantity: 2 }] } });`;
// network: the storefront fetches its order from /mock/orders (returns the NET-7700 order).
const NET_EMIT = `var xhr=new XMLHttpRequest(); xhr.open("GET","/mock/orders"); xhr.send();`;
// iframe: an embedded checkout posts the purchase to the parent window.
const IFRAME_EMIT = `window.postMessage({ type: "TRAINING_PURCHASE", order: { id: "IF-9900", total: 250.0, currency: "USD", city: "Denver", state: "CO", country: "USA", items: [{ sku: "IF-1", name: "Vape Cart", category: "vape", unitPrice: 125.0, quantity: 2 }] } }, "*");`;

/* ------------------------------------------------------------------ validator helpers */

const ok = (id: string, label: string, pass: boolean, detail?: string | false | null | 0): Check => ({
  id,
  label,
  pass,
  detail: detail || undefined,
});

const txItems = (b: MicroBundle) => b.good.filter((e) => e.eventType === "transaction_item");
const txEvent = (b: MicroBundle) => b.good.find((e) => e.eventType === "transaction");

/* ------------------------------------------------------------------ lessons */

const APP = "mj-training";

export const LESSONS: Lesson[] = [
  /* ---------------------------------------------------------------- 0. Snowplow basics */
  {
    id: "basics",
    title: "Snowplow Basics",
    tagline: "Collectors, events & schemas",
    difficulty: "Basics",
    icon: "◎",
    appId: APP + "-basics",
    language: "javascript",
    mission: `Every MediaJel integration is a thin layer over **Snowplow**, the open-source event pipeline. The flow never changes: a page loads the **tag**, the tag emits **events**, a **collector** receives them, and each event is validated against an **Iglu schema** before it's enriched and written to the warehouse. An event that doesn't match its schema is quarantined as a *bad* event instead of silently corrupting reporting.

This trainer runs that exact pipeline locally with **Snowplow Micro**, so every Play grades your code against the same validation production uses. We'll start with the simplest payload: a **structured event** — Snowplow's generic \`category\` / \`action\` / \`label\` shape for one-off interactions.`,
    objectives: [
      "Call the low-level API the tag exposes on the page as `window.tracker(command, payload)`.",
      'Fire a `trackStructEvent` with category `"education"` and action `"lesson_complete"`.',
      "Press Play and watch it appear in the **Events** panel — that's Micro confirming the collector accepted it.",
    ],
    hints: [
      "The tag exposes the low-level Snowplow API as window.tracker(command, ...args).",
      'Structured events: window.tracker("trackStructEvent", { category, action, label })',
    ],
    starterCode: `// Fire a structured event through the raw Snowplow API.
// Required: category "education", action "lesson_complete".

window.tracker("trackStructEvent", {
  // TODO: category, action
});`,
    solutionCode: `window.tracker("trackStructEvent", {
  category: "education",
  action: "lesson_complete",
  label: "snowplow-basics",
});`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const ev = b.good.find((e) => e.eventType === "struct");
      const cat = ev?.event?.se_category;
      const act = ev?.event?.se_action;
      return [
        ok("captured", "A structured event reached the collector", !!ev),
        ok("category", 'Category is "education"', cat === "education", cat && `got "${cat}"`),
        ok("action", 'Action is "lesson_complete"', act === "lesson_complete", act && `got "${act}"`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 1. Add the tracker */
  {
    id: "add-tag",
    title: "Add the Tracker",
    tagline: "Your first tag",
    difficulty: "Basics",
    icon: "❡",
    appId: APP + "-tag",
    language: "html",
    mission: `Installing MediaJel is one line of markup: a **script tag** loaded from \`tags.cnna.io\`. Its query string carries the configuration — most importantly an **\`appId\`** that maps to one advertiser account. Every event the tag emits is stamped with that \`appId\` (as \`app_id\`), which is how reporting attributes activity back to the right advertiser.

As soon as it boots, the tag fires a **page view** on its own — no code required. In this sandbox the script is served locally and pointed at Micro, but the markup is byte-for-byte what you'd paste on a client's site.`,
    objectives: [
      "Add the `<script>` tag that loads the tracker from `tags.cnna.io`.",
      "Set the `appId` query parameter to `" + APP + "-tag` (replace the `YOUR_APP_ID` placeholder).",
      "Confirm the tag boots and emits its automatic `page_view` carrying the correct `app_id`.",
    ],
    hints: ["The query string carries the config: ...cnna.io/?appId=YOUR_APP_ID", `Use appId=${APP}-tag`],
    starterCode: `<!-- Paste this on your site, just before </head> -->
<script src="https://tags.cnna.io/?appId=YOUR_APP_ID"></script>`,
    solutionCode: `<script src="https://tags.cnna.io/?appId=${APP}-tag"></script>`,
    buildSandbox: (code, ctx) => htmlSandbox(code, ctx).srcdoc,
    validate: (b) => {
      const pv = b.good.find((e) => e.eventType === "page_view");
      const aid = pv?.event?.app_id;
      const placeholder = !aid || /your_app_id|xxxxx|^$/i.test(String(aid));
      return [
        ok("loaded", "The tag loaded and fired a page view", !!pv),
        ok("appid", "A real appId is set (not the placeholder)", !!pv && !placeholder, aid && `app_id = "${aid}"`),
        ok("match", `appId is "${APP}-tag"`, aid === `${APP}-tag`, aid && `got "${aid}"`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 2. Transactions */
  {
    id: "transactions",
    title: "Track Transactions",
    tagline: "Ecommerce purchases",
    difficulty: "Intermediate",
    icon: "₪",
    appId: APP + "-tx",
    language: "javascript",
    mission: `Purchases are the conversion DSP campaigns optimize toward, so getting them right matters most. On the order-confirmation page the tag exposes **\`window.trackTrans\`**: call it with the order header (id, total, tax, shipping, currency, location) and one entry per product in \`items\`.

The tracker expands that single call into a Snowplow **\`transaction\`** event for the order plus a **\`transaction_item\`** event for each line, all stitched together by \`orderId\` so revenue and products reconcile downstream.`,
    objectives: [
      "Call `window.trackTrans({...})` with order id `T-1001`, total `129.99`, and currency `USD`.",
      "Include at least one entry in `items` (sku, name, category, unitPrice, quantity, orderId, currency).",
      "Confirm one `transaction` and at least one `transaction_item` reach the pipeline.",
    ],
    hints: [
      "window.trackTrans({ id, total, tax, shipping, currency, city, state, country, items: [...] })",
      "Each item: { sku, name, category, unitPrice, quantity, orderId, currency }",
    ],
    starterCode: `// The tag is loaded. Track the purchase with window.trackTrans.
// Required: id "T-1001", total 129.99, currency "USD", and at least one item.

window.trackTrans({
  // TODO: id, total, currency, tax, shipping, city, state, country
  items: [
    // TODO: { sku, name, category, unitPrice, quantity, orderId, currency }
  ],
});`,
    solutionCode: `window.trackTrans({
  id: "T-1001", total: 129.99, currency: "USD", tax: 8.5, shipping: 5,
  city: "Denver", state: "CO", country: "USA",
  items: [{ sku: "SKU-1", name: "Sativa Pre-Roll", category: "flower", unitPrice: 59.99, quantity: 2, orderId: "T-1001", currency: "USD" }],
});`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const tx = txEvent(b);
      const items = txItems(b);
      const total = tx?.event?.tr_total;
      return [
        ok("tx", "A transaction reached the pipeline", !!tx),
        ok(
          "id",
          'Order id is "T-1001"',
          tx?.event?.tr_orderid === "T-1001",
          tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`,
        ),
        ok("total", "Total is 129.99", Number(total) === 129.99, total != null && `got ${total}`),
        ok("currency", "Currency is USD", tx?.event?.tr_currency === "USD"),
        ok("items", "At least one line item was tracked", items.length >= 1, `${items.length} item(s)`),
        ok("valid", "Every event validated against its schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 3. Sign ups */
  {
    id: "signups",
    title: "Track Sign Ups",
    tagline: "Registration conversions",
    difficulty: "Intermediate",
    icon: "✦",
    appId: APP + "-signup",
    language: "javascript",
    mission: `Registrations are a primary conversion for lead-gen advertisers. Unlike a structured event, a sign-up is a **self-describing event**: its payload is governed by the versioned \`com.mediajel.events/sign_up\` schema, so the collector enforces exactly which fields are allowed and required.

Call **\`window.trackSignUp\`** when a user registers. Micro validates the result against the real schema served from \`iglu.mediajel.ninja\` — get a field wrong and it lands as a *bad* event instead of a *good* one.`,
    objectives: [
      "Call `window.trackSignUp({...})` at the point of registration.",
      "Provide at least `emailAddress` and `uuid` — the identity fields the schema expects.",
      "Confirm the event validates against `com.mediajel.events/sign_up` (good, not bad).",
    ],
    hints: [
      "window.trackSignUp({ uuid, emailAddress, firstName, lastName, state, ... })",
      "emailAddress and uuid are the two that matter for this lesson.",
    ],
    starterCode: `// Track a registration with window.trackSignUp.
// Include at least an emailAddress and a uuid.

window.trackSignUp({
  // TODO: uuid, emailAddress, firstName, lastName, state
});`,
    solutionCode: `window.trackSignUp({
  uuid: "user-7781", emailAddress: "ada@example.com",
  firstName: "Ada", lastName: "Lovelace", state: "CO",
});`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const ev = findSelfDescribing(b, "sign_up");
      const data = ev ? (unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data) : null;
      return [
        ok("captured", "A self-describing sign_up event was captured", !!ev),
        ok(
          "schema",
          "Validated against the com.mediajel.events/sign_up schema",
          !!ev && (ev.schema || "").includes("sign_up"),
        ),
        ok("email", "emailAddress is present", !!data?.emailAddress, data?.emailAddress),
        ok("uuid", "uuid is present", !!data?.uuid, data?.uuid),
        ok("valid", "Validated against its schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 4. Ad impressions */
  {
    id: "impressions",
    title: "Track Ad Impressions",
    tagline: "DSP impression events",
    difficulty: "Advanced",
    icon: "◐",
    appId: APP + "-imp",
    language: "javascript",
    mission: `When a creative renders in a DSP placement, an impression is fired so delivery and viewability can later be reconciled against conversions. In MediaJel's pipeline that's a self-describing **\`com.mediajel.events/ad_impression\`** event carrying the advertiser, creative, line item and site that served it.

Most of the time a partner integration emits these for you. Here you'll send one by hand with the raw \`trackSelfDescribingEvent\` API so you can see the schema and payload directly.`,
    objectives: [
      'Fire `window.tracker("trackSelfDescribingEvent", { event: { schema, data } })`.',
      "Set `schema` to `iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3`.",
      "Include `advertiserId` and `creativeId` in `data`.",
      "Confirm it validates against the `ad_impression` schema.",
    ],
    hints: [
      'window.tracker("trackSelfDescribingEvent", { schema, data }) — v2 wraps it as { event: { schema, data } }.',
      "schema: iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3",
    ],
    starterCode: `// Fire an ad_impression self-describing event with the raw API.
// schema: iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3
// data must include advertiserId and creativeId.

window.tracker("trackSelfDescribingEvent", {
  event: {
    schema: "", // TODO
    data: {
      // TODO: advertiserId, creativeId, lineItemId, siteName
    },
  },
});`,
    solutionCode: `window.tracker("trackSelfDescribingEvent", {
  event: {
    schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3",
    data: { advertiserId: "adv-42", creativeId: "cr-9001", lineItemId: "li-7", siteName: "example.com" },
  },
});`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const ev = findSelfDescribing(b, "ad_impression");
      const data = ev ? (unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data) : null;
      return [
        ok("captured", "An ad_impression event was captured", !!ev),
        ok(
          "schema",
          "Validated against com.mediajel.events/ad_impression",
          !!ev && (ev.schema || "").includes("ad_impression"),
        ),
        ok("advertiser", "advertiserId is present", !!data?.advertiserId, data?.advertiserId),
        ok("creative", "creativeId is present", !!data?.creativeId, data?.creativeId),
        ok("valid", "Validated against its schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 5. Google dataLayer */
  {
    id: "datalayer",
    title: "Listen to the Google dataLayer",
    tagline: "Auto-capture from GTM",
    difficulty: "Advanced",
    icon: "⧉",
    appId: APP + "-dl",
    language: "javascript",
    mission: `This storefront already pushes GA4 ecommerce events to Google's **\`window.dataLayer\`** for Google Tag Manager — including a **\`purchase\`** when an order completes. Your job is to **listen** to that dataLayer and forward the purchase to Snowplow, without touching the site's code.

The tag exposes the same source the real tracker uses: **\`window.datalayerSource(callback)\`**. It calls your callback for every dataLayer entry (replaying ones already there), so you can read the GA4 \`purchase\` and map it onto **\`window.trackTrans\`**. Open the **Console** and log inside your callback — or log \`window.dataLayer\` — to see what the site emits.`,
    objectives: [
      "Subscribe with `window.datalayerSource(function (entry) { … })` — don't push anything yourself.",
      'When `entry.event === "purchase"`, map `entry.ecommerce` (transaction_id, value, items…) onto `window.trackTrans`.',
      "Confirm a `transaction` with id `DL-5500` and total `84.00` reaches the pipeline.",
    ],
    hints: [
      "The tag exposes window.datalayerSource(callback) — subscribe to it; it even replays entries already on the dataLayer.",
      "Log inside your callback (or log window.dataLayer) to see the shapes. A GA4 purchase carries an ecommerce object: transaction_id, value, and items[] (item_id, item_name, price, quantity).",
      "Map those fields onto a window.trackTrans order, then check the Events panel — a good `transaction` there is the only confirmation that counts.",
    ],
    starterCode: `// The storefront already pushes GA4 events to window.dataLayer (incl. a "purchase").
// LISTEN to it and forward the purchase — don't push anything yourself.
// Tip: console.log(entry) inside the callback (or console.log(window.dataLayer)) to debug.

window.datalayerSource(function (entry) {
  // TODO: when entry.event === "purchase", map entry.ecommerce -> window.trackTrans({...})
});`,
    buildSandbox: (code, ctx) =>
      listenSandbox(code, ctx, {
        readyExpr: "typeof window.datalayerSource==='function' && typeof window.trackTrans==='function'",
        seedJs: DL_SEED,
      }),
    validate: (b) => {
      const tx = txEvent(b);
      return [
        ok("captured", "Your listener forwarded the dataLayer purchase as a transaction", !!tx),
        ok(
          "id",
          'Transaction id is "DL-5500"',
          tx?.event?.tr_orderid === "DL-5500",
          tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`,
        ),
        ok(
          "total",
          "Value (84.00) carried through",
          Number(tx?.event?.tr_total) === 84,
          tx?.event?.tr_total != null && `got ${tx.event.tr_total}`,
        ),
        ok("items", "Line item(s) carried through", txItems(b).length >= 1, `${txItems(b).length} item(s)`),
        ok("valid", "Every event validated against its schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 6. Network requests */
  {
    id: "network",
    title: "Listen to Network Requests",
    tagline: "Auto-capture from fetch/XHR",
    difficulty: "Advanced",
    icon: "⇄",
    appId: APP + "-net",
    language: "javascript",
    mission: `Some platforms never populate a dataLayer — the order only exists in an **API response** the storefront fetches. This site requests its order from **\`/mock/orders\`** on checkout. Rather than call that endpoint yourself, you **listen** to the network and forward whatever order comes back.

The tag exposes **\`window.xhrResponseSource(callback)\`** — it calls your callback with the \`XMLHttpRequest\` for every request that completes. Read \`xhr.responseText\`, parse the order, and forward it with **\`window.trackTrans\`**. Filter by \`xhr.responseURL\` so you ignore the tracker's own beacons.`,
    objectives: [
      "Subscribe with `window.xhrResponseSource(function (xhr) { … })` — don't fetch anything yourself.",
      "When `xhr.responseURL` is the `/mock/orders` call, `JSON.parse(xhr.responseText)` and forward it with `window.trackTrans`.",
      "Confirm transaction `NET-7700` is captured from the response.",
    ],
    hints: [
      "The tag exposes window.xhrResponseSource(callback) — it hands you each XMLHttpRequest as it finishes.",
      "Guard by xhr.responseURL so you ignore the tracker's own beacons, then read and parse xhr.responseText.",
      "Map the order onto window.trackTrans, then check the Events panel — the `transaction` landing there is your proof.",
    ],
    starterCode: `// The storefront fetches its order from /mock/orders on checkout.
// LISTEN to the network and forward the order — don't fetch it yourself.
// Tip: console.log(xhr.responseURL, xhr.responseText) inside the callback to debug.

window.xhrResponseSource(function (xhr) {
  // TODO: when xhr.responseURL is /mock/orders, JSON.parse(xhr.responseText) and window.trackTrans({...})
});`,
    buildSandbox: (code, ctx) =>
      listenSandbox(code, ctx, {
        readyExpr: "typeof window.xhrResponseSource==='function' && typeof window.trackTrans==='function'",
        emitJs: NET_EMIT,
      }),
    validate: (b) => {
      const tx = txEvent(b);
      return [
        ok("captured", "Your listener forwarded the order from the network response", !!tx),
        ok(
          "id",
          'Transaction id is "NET-7700"',
          tx?.event?.tr_orderid === "NET-7700",
          tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`,
        ),
        ok("items", "Line item(s) carried through", txItems(b).length >= 1, `${txItems(b).length} item(s)`),
        ok("valid", "Every event validated against its schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 7. Iframes */
  {
    id: "iframes",
    title: "Listen to Iframes",
    tagline: "postMessage from embedded checkouts",
    difficulty: "Advanced",
    icon: "❒",
    appId: APP + "-iframe",
    language: "javascript",
    mission: `Many dispensaries run their checkout inside an embedded provider — Dutchie, Jane, Meadow — that lives in a cross-origin **iframe**. Browser security stops that iframe from writing to the parent page, so it broadcasts what happened with **\`postMessage\`** instead. Here, the embedded checkout posts a **\`TRAINING_PURCHASE\`** message when the order completes — your job is to **listen** for it and forward the purchase.

The tag exposes **\`window.postMessageSource(callback)\`** — it calls your callback with each \`message\` event the page receives. Read \`event.data.order\` and forward it with **\`window.trackTrans\`**.`,
    objectives: [
      "Subscribe with `window.postMessageSource(function (event) { … })` — don't post anything yourself.",
      'When `event.data.type === "TRAINING_PURCHASE"`, forward `event.data.order` with `window.trackTrans`.',
      "Confirm the tracker captures it as transaction `IF-9900`.",
    ],
    hints: [
      "The tag exposes window.postMessageSource(callback) — it hands you each message event the page receives.",
      'Read event.data and guard on its type ("TRAINING_PURCHASE") before using event.data.order.',
      "Map the order onto window.trackTrans, then check the Events panel — the `transaction` there is the only confirmation that counts.",
    ],
    starterCode: `// An embedded checkout iframe posts a TRAINING_PURCHASE message when the order completes.
// LISTEN for it and forward the order — don't post anything yourself.
// Tip: console.log(event.data) inside the callback to debug.

window.postMessageSource(function (event) {
  // TODO: when event.data.type === "TRAINING_PURCHASE", map event.data.order -> window.trackTrans({...})
});`,
    solutionCode: `window.postMessageSource(function (event) {
  var msg = event && event.data;
  if (!msg || msg.type !== "TRAINING_PURCHASE" || !msg.order) return;
  var o = msg.order;
  window.trackTrans({
    id: o.id,
    total: o.total,
    tax: o.tax || 0,
    shipping: o.shipping || 0,
    currency: o.currency || "USD",
    city: o.city || "N/A",
    state: o.state || "N/A",
    country: o.country || "USA",
    items: (o.items || []).map(function (it) {
      return {
        sku: it.sku,
        name: it.name,
        category: it.category,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        orderId: o.id,
        currency: o.currency || "USD",
      };
    }),
  });
});`,
    buildSandbox: (code, ctx) =>
      listenSandbox(code, ctx, {
        readyExpr: "typeof window.postMessageSource==='function' && typeof window.trackTrans==='function'",
        emitJs: IFRAME_EMIT,
      }),
    validate: (b) => {
      const tx = txEvent(b);
      return [
        ok("captured", "Your listener forwarded the iframe order as a transaction", !!tx),
        ok(
          "id",
          'Transaction id is "IF-9900"',
          tx?.event?.tr_orderid === "IF-9900",
          tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`,
        ),
        ok(
          "total",
          "Total (250.00) carried through",
          Number(tx?.event?.tr_total) === 250,
          tx?.event?.tr_total != null && `got ${tx.event.tr_total}`,
        ),
        ok("items", "Line item(s) carried through", txItems(b).length >= 1, `${txItems(b).length} item(s)`),
        ok("valid", "Every event validated against its schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 5. Add to cart */
  {
    id: "add-to-cart",
    title: "Track Add to Cart",
    tagline: "Cart engagement",
    difficulty: "Intermediate",
    icon: "⊕",
    appId: APP + "-atc",
    language: "javascript",
    mission: `Cart actions sit in the middle of the funnel, between a product view and a purchase, and they feed mid-funnel optimization and retargeting. After the tag loads it exposes **\`window.addToCart\`** for you to call whenever a shopper adds a product.

The tracker turns that call into a Snowplow **\`add_to_cart\`** self-describing event describing the product and quantity.`,
    objectives: [
      "Call `window.addToCart({...})` for the product the shopper added.",
      "Identify it with sku `SKU-9`, plus a `name` and a `unitPrice` in `USD`.",
      "Confirm an `add_to_cart` event reaches the pipeline.",
    ],
    hints: ["window.addToCart({ sku, name, category, unitPrice, quantity, currency })"],
    starterCode: `// The tag is loaded. Track an add-to-cart with window.addToCart.
window.addToCart({
  // TODO: sku "SKU-9", name, category, unitPrice, quantity, currency "USD"
});`,
    solutionCode: `window.addToCart({ sku: "SKU-9", name: "OG Kush Eighth", category: "flower", unitPrice: 45, quantity: 1, currency: "USD" });`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const ev = findSelfDescribing(b, "add_to_cart");
      const data = ev ? (unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data) : null;
      return [
        ok("captured", "An add_to_cart event reached the pipeline", !!ev),
        ok("sku", 'sku is "SKU-9"', data?.sku === "SKU-9", data?.sku && `got "${data.sku}"`),
        ok("name", "A product name was tracked", !!data?.name, data?.name),
        ok("valid", "Validated against the add_to_cart schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 6. Remove from cart */
  {
    id: "remove-from-cart",
    title: "Track Remove from Cart",
    tagline: "Cart abandonment",
    difficulty: "Intermediate",
    icon: "⊖",
    appId: APP + "-rfc",
    language: "javascript",
    mission: `Removals are the inverse signal, and just as useful: they expose hesitation and help measure cart abandonment against completed orders. The tag exposes **\`window.removeFromCart\`** with the same product shape as add-to-cart.

Call it when a shopper takes an item back out of their cart; the tracker emits a Snowplow **\`remove_from_cart\`** event.`,
    objectives: [
      "Call `window.removeFromCart({...})` for the product the shopper removed.",
      "Identify it with sku `SKU-9` and a `quantity`.",
      "Confirm a `remove_from_cart` event reaches the pipeline.",
    ],
    hints: ["window.removeFromCart({ sku, name, category, unitPrice, quantity, currency })"],
    starterCode: `// Track a remove-from-cart with window.removeFromCart.
window.removeFromCart({
  // TODO: sku "SKU-9", name, category, unitPrice, quantity, currency "USD"
});`,
    solutionCode: `window.removeFromCart({ sku: "SKU-9", name: "OG Kush Eighth", category: "flower", unitPrice: 45, quantity: 1, currency: "USD" });`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const ev = findSelfDescribing(b, "remove_from_cart");
      const data = ev ? (unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data) : null;
      return [
        ok("captured", "A remove_from_cart event reached the pipeline", !!ev),
        ok("sku", 'sku is "SKU-9"', data?.sku === "SKU-9", data?.sku && `got "${data.sku}"`),
        ok("valid", "Validated against the remove_from_cart schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 10. Build an extension (Advanced) */
  {
    id: "extension",
    title: "Build a Tracker Extension",
    tagline: "Intercept signals with (tracker) => tracker",
    difficulty: "Advanced",
    icon: "⚙",
    appId: APP + "-ext",
    language: "javascript",
    mission: `The production tracker isn't monolithic — it's **composed from extensions**, each a function shaped \`(tracker) => tracker\` that wraps tracker methods to add behavior. Deduplication, segment stitching, third-party tag registration and the Google/Bing Ads plugins are all extensions; \`applyExtensions(tracker, [ext1, ext2, …])\` simply threads the tracker through them in order. \`withDeduplicationExtension\`, for instance, wraps \`tracker.ecommerce.trackTransaction\` so a repeated order id is dropped.

In this sandbox you register your own extension through the *real* \`applyExtensions\` via **\`window.mjApplyExtension(yourExtension)\`**, which then rebinds \`window.trackTrans\` to your wrapped method.`,
    objectives: [
      "Write `withTrainingFee(tracker)` that captures and wraps `tracker.ecommerce.trackTransaction`.",
      "In the wrapper, add `5` to `input.total`, call the original method, and `return tracker`.",
      "Register it with `window.mjApplyExtension(withTrainingFee)`, then fire a `100` transaction (id `EXT-1`).",
      "Confirm the pipeline receives a total of `105` — proof your wrapper actually ran.",
    ],
    hints: [
      "Wrap the method: const orig = tracker.ecommerce.trackTransaction; tracker.ecommerce.trackTransaction = (input) => { input.total += 5; orig(input); }; return tracker;",
      "Register, then track: window.mjApplyExtension(withTrainingFee); window.trackTrans({ ... });",
    ],
    starterCode: `// A Snowplow tracker extension: intercept transactions and add a $5 fee.
function withTrainingFee(tracker) {
  // TODO: wrap tracker.ecommerce.trackTransaction to add 5 to input.total, then call the original
  return tracker;
}

window.mjApplyExtension(withTrainingFee);

window.trackTrans({
  id: "EXT-1", total: 100, currency: "USD", tax: 0, shipping: 0,
  city: "Denver", state: "CO", country: "USA",
  items: [{ sku: "x", name: "Item", category: "demo", unitPrice: 100, quantity: 1, orderId: "EXT-1", currency: "USD" }],
});`,
    solutionCode: `function withTrainingFee(tracker) {
  const original = tracker.ecommerce.trackTransaction;
  tracker.ecommerce.trackTransaction = (input) => { input.total = input.total + 5; original(input); };
  return tracker;
}
window.mjApplyExtension(withTrainingFee);
window.trackTrans({ id: "EXT-1", total: 100, currency: "USD", tax: 0, shipping: 0, city: "Denver", state: "CO", country: "USA", items: [{ sku: "x", name: "Item", category: "demo", unitPrice: 100, quantity: 1, orderId: "EXT-1", currency: "USD" }] });`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training", "typeof window.mjApplyExtension==='function'"),
    validate: (b) => {
      const tx = txEvent(b);
      return [
        ok("captured", "The transaction reached the pipeline", !!tx),
        ok(
          "id",
          'Transaction id is "EXT-1"',
          tx?.event?.tr_orderid === "EXT-1",
          tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`,
        ),
        ok(
          "intercepted",
          "Your extension intercepted it — total is 105 (100 + $5 fee)",
          Number(tx?.event?.tr_total) === 105,
          tx?.event?.tr_total != null && `got ${tx.event.tr_total}`,
        ),
        ok("valid", "Every event validated against its schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },

  /* ---------------------------------------------------------------- 11. Frictionless custom tag (Advanced) */
  {
    id: "frictionless",
    title: "Deploy a Frictionless Custom Tag",
    tagline: "Per-domain one-off scripts",
    difficulty: "Advanced",
    icon: "⌁",
    appId: APP + "-friction",
    language: "javascript",
    mission: `Sometimes a site needs capture that none of the standard adapters cover. The escape hatch is a **frictionless custom tag**: a one-off script named for the client's domain (e.g. \`a21dispensary.com.ts\`), deployed to S3, and loaded at runtime *only for that domain* via \`getCustomTags\`. Because it runs on the page, it can reach into the site's DOM directly — wiring up listeners and firing events the generic adapters never could.

This sandbox is a stand-in client site with a **contact form** (name, email, and a Send button). You're writing the per-domain tag that turns a form submission into a tracked sign-up; we auto-submit the form to test it.`,
    objectives: [
      "Hook the form's submit by adding a `click` listener to `.submit-btn`.",
      "Read the visitor's name and email from the form's `[data-name]` fields.",
      "Fire a `sign_up` self-describing event (schema `…/sign_up/jsonschema/1-0-2`) with that data.",
      "Confirm the captured sign_up carries the visitor's email and name.",
    ],
    hints: [
      "Grab the button: document.querySelector('.submit-btn') and add a 'click' listener.",
      "Read fields: document.querySelector('[data-name=\"your-email\"]').value",
      'Fire: window.tracker("trackSelfDescribingEvent", { event: { schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2", data: { uuid, emailAddress, … } } })',
    ],
    starterCode: `// Frictionless custom tag for the client's domain — the tag loads this on their site.
// Hook the contact form's submit and fire a sign_up when a visitor submits.

const submit = document.querySelector(".submit-btn");
submit.addEventListener("click", function () {
  const name = document.querySelector('[data-name="your-name"]').value;
  const email = document.querySelector('[data-name="your-email"]').value;
  const [firstName, lastName] = name.split(" ");

  // TODO: fire a sign_up self-describing event with window.tracker(...)
});`,
    solutionCode: `const submit = document.querySelector(".submit-btn");
submit.addEventListener("click", function () {
  const name = document.querySelector('[data-name="your-name"]').value;
  const email = document.querySelector('[data-name="your-email"]').value;
  const [firstName, lastName] = name.split(" ");
  window.tracker("trackSelfDescribingEvent", {
    event: {
      schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
      data: { uuid: email, firstName: firstName, lastName: lastName, emailAddress: email, hashedEmailAddress: email, phoneNumber: "N/A" },
    },
  });
});`,
    buildSandbox: (code, ctx) => frictionlessSandbox(code, ctx),
    validate: (b) => {
      const ev = findSelfDescribing(b, "sign_up");
      const data = ev ? (unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data) : null;
      return [
        ok("captured", "A sign_up fired when the form was submitted", !!ev),
        ok("email", "The visitor's email was captured", !!data?.emailAddress, data?.emailAddress),
        ok("name", "The visitor's name was captured", !!data?.firstName, data?.firstName),
        ok("valid", "Validated against the sign_up schema (none quarantined by Micro)", noBadEvents(b)),
      ];
    },
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);

/* ------------------------------------------------------------------ curriculum */

/**
 * The curriculum: a flat list of sections, each a card on the Courses page. "Getting Started" folds
 * in everything an advertiser needs first — the tag, the basics, and the core conversions; "Advanced"
 * holds the rest. This is the SINGLE source of truth for grouping and ordering — change a `lessonIds`
 * array to reorder or regroup; the LESSONS array order is irrelevant. (Pre-requisites — the debugging
 * extensions — is a separate, lesson-free card handled in the UI.)
 */
export const SECTIONS: Section[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "🚀",
    blurb: "Install the tag, learn how the pipeline works, and capture the core conversions every advertiser needs.",
    lessonIds: ["add-tag", "basics", "transactions", "signups", "add-to-cart", "remove-from-cart"],
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: "⚡",
    blurb:
      "Auto-capture from the page, fire raw self-describing events, extend the tracker, and ship per-domain custom tags.",
    lessonIds: ["datalayer", "network", "iframes", "impressions", "extension", "frictionless"],
  },
];

/** All lessons in curriculum (display) order — the canonical sequence for stepping & numbering. */
export const ORDERED_LESSONS: Lesson[] = SECTIONS.flatMap((s) =>
  s.lessonIds.map((id) => lessonById(id)).filter((l): l is Lesson => !!l),
);

/** Zero-based position of a lesson in the overall curriculum (−1 if not found). */
export const lessonIndex = (id: string) => ORDERED_LESSONS.findIndex((l) => l.id === id);

/** The next lesson in curriculum order, or undefined at the end. */
export const nextLesson = (id: string): Lesson | undefined => ORDERED_LESSONS[lessonIndex(id) + 1];

/** The section a lesson belongs to. */
export const sectionOf = (id: string) => SECTIONS.find((s) => s.lessonIds.includes(id));
