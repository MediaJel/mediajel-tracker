import {
  Check,
  Lesson,
  MicroBundle,
  SandboxContext,
  findSelfDescribing,
  unstructData,
} from "./lib/core";

/* ------------------------------------------------------------------ sandbox builders */

const consoleBridge = `
['log','info','warn','error'].forEach(function(l){
  var o=console[l]?console[l].bind(console):function(){};
  console[l]=function(){ try{parent.postMessage({__mj:'log',level:l,text:[].slice.call(arguments).map(function(a){return typeof a==='object'?JSON.stringify(a):String(a);}).join(' ')},'*');}catch(e){} o.apply(null,arguments); };
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

/* ------------------------------------------------------------------ validator helpers */

const ok = (
  id: string,
  label: string,
  pass: boolean,
  detail?: string | false | null | 0,
): Check => ({
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
    number: 0,
    section: "Basics",
    title: "Snowplow Basics",
    tagline: "Collectors, events & schemas",
    difficulty: "Basics",
    icon: "◎",
    appId: APP + "-basics",
    language: "javascript",
    mission: `Every MediaJel integration speaks **Snowplow**. A page loads the **tag**, the tag sends **events** to a **collector**, and the collector validates each event against a **schema** before it lands in the warehouse.

This whole site is wired to a *real* Snowplow **Micro** pipeline running locally — so everything you do here is graded against the same validation production uses.

**Your mission:** fire a **structured event** with the raw Snowplow API. Use \`window.tracker\` with category \`"education"\` and action \`"lesson_complete"\`.`,
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
    number: 1,
    section: "Basics",
    title: "Add the Tracker",
    tagline: "Your first tag",
    difficulty: "Basics",
    icon: "❡",
    appId: APP + "-tag",
    language: "html",
    mission: `Installing MediaJel is one line: a **script tag**. It loads from \`tags.cnna.io\` and carries an **\`appId\`** that identifies the advertiser.

On load, the tag automatically fires a **page view** — the heartbeat of every integration.

**Your mission:** complete the tag so it uses the appId **\`${APP}-tag\`**. (In this sandbox the tag is served locally and pointed at Micro, but the markup is exactly what you'd paste on a real site.)`,
    hints: [
      "The query string carries the config: ...cnna.io/?appId=YOUR_APP_ID",
      `Use appId=${APP}-tag`,
    ],
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
    number: 2,
    section: "Basics",
    title: "Track Transactions",
    tagline: "Ecommerce purchases",
    difficulty: "Intermediate",
    icon: "₪",
    appId: APP + "-tx",
    language: "javascript",
    mission: `Revenue is the headline event. After the tag loads it exposes **\`window.trackTrans\`** — call it on your order-confirmation page with the order total and line items.

**Your mission:** track a purchase with id **\`T-1001\`**, total **\`129.99\`**, currency **USD**, and at least **one item**.`,
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
        ok("id", 'Order id is "T-1001"', tx?.event?.tr_orderid === "T-1001", tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`),
        ok("total", "Total is 129.99", Number(total) === 129.99, total != null && `got ${total}`),
        ok("currency", "Currency is USD", tx?.event?.tr_currency === "USD"),
        ok("items", "At least one line item was tracked", items.length >= 1, `${items.length} item(s)`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 3. Sign ups */
  {
    id: "signups",
    number: 3,
    section: "Basics",
    title: "Track Sign Ups",
    tagline: "Registration conversions",
    difficulty: "Intermediate",
    icon: "✦",
    appId: APP + "-signup",
    language: "javascript",
    mission: `Sign-ups are **self-describing events** validated against the \`com.mediajel.events/sign_up\` schema. Call **\`window.trackSignUp\`** when a user registers.

**Your mission:** track a sign-up with an **\`emailAddress\`** and a **\`uuid\`**. (Micro validates it against the real schema served from \`iglu.mediajel.ninja\`.)`,
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
      const data = ev ? unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data : null;
      return [
        ok("captured", "A self-describing sign_up event was captured", !!ev),
        ok("schema", "Validated against the com.mediajel.events/sign_up schema", !!ev && (ev.schema || "").includes("sign_up")),
        ok("email", "emailAddress is present", !!data?.emailAddress, data?.emailAddress),
        ok("uuid", "uuid is present", !!data?.uuid, data?.uuid),
      ];
    },
  },

  /* ---------------------------------------------------------------- 4. Ad impressions */
  {
    id: "impressions",
    number: 4,
    section: "Basics",
    title: "Track Ad Impressions",
    tagline: "DSP impression events",
    difficulty: "Advanced",
    icon: "◐",
    appId: APP + "-imp",
    language: "javascript",
    mission: `Impression pixels report when a creative is shown. Under the hood the tag fires a self-describing **\`com.mediajel.events/ad_impression\`** event. Send one directly with the raw API.

**Your mission:** fire an \`ad_impression\` self-describing event with an **\`advertiserId\`** and a **\`creativeId\`**.`,
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
      const data = ev ? unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data : null;
      return [
        ok("captured", "An ad_impression event was captured", !!ev),
        ok("schema", "Validated against com.mediajel.events/ad_impression", !!ev && (ev.schema || "").includes("ad_impression")),
        ok("advertiser", "advertiserId is present", !!data?.advertiserId, data?.advertiserId),
        ok("creative", "creativeId is present", !!data?.creativeId, data?.creativeId),
      ];
    },
  },

  /* ---------------------------------------------------------------- 5. Google dataLayer */
  {
    id: "datalayer",
    number: 7,
    section: "Basics",
    title: "Listen to the Google dataLayer",
    tagline: "Auto-capture from GTM",
    difficulty: "Advanced",
    icon: "⧉",
    appId: APP + "-dl",
    language: "javascript",
    mission: `Most stores already push ecommerce events to Google's **\`window.dataLayer\`** (GA4 format). MediaJel can listen and convert those into transactions **automatically** — no manual \`trackTrans\` needed.

**Your mission:** push a GA4 **\`purchase\`** event to \`window.dataLayer\`. The tracker (running in \`environment=training\`) will detect it and forward the transaction.`,
    hints: [
      'GA4 shape: dataLayer.push({ event: "purchase", ecommerce: { transaction_id, value, currency, items:[...] } })',
      "items use GA4 keys: item_id, item_name, item_category, price, quantity",
    ],
    starterCode: `// Push a GA4 "purchase" event to window.dataLayer.
// Use transaction_id "DL-5500", value 84.00, currency "USD", and one item.
// The tracker (environment=training) auto-detects it — no trackTrans call needed.

window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  // TODO: event: "purchase", ecommerce: { transaction_id, value, tax, shipping, currency, items: [...] }
  // GA4 item keys: item_id, item_name, item_category, price, quantity
});`,
    solutionCode: `window.dataLayer = window.dataLayer || [];
window.dataLayer.push({ event: "purchase", ecommerce: { transaction_id: "DL-5500", value: 84.0, tax: 6.0, shipping: 0, currency: "USD", items: [{ item_id: "GA-1", item_name: "Gummies", item_category: "edibles", price: 42.0, quantity: 2 }] } });`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const tx = txEvent(b);
      return [
        ok("captured", "The dataLayer purchase was auto-detected as a transaction", !!tx),
        ok("id", 'Transaction id is "DL-5500"', tx?.event?.tr_orderid === "DL-5500", tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`),
        ok("total", "Value (84.00) carried through", Number(tx?.event?.tr_total) === 84, tx?.event?.tr_total != null && `got ${tx.event.tr_total}`),
        ok("items", "Line item(s) carried through", txItems(b).length >= 1, `${txItems(b).length} item(s)`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 6. Network requests */
  {
    id: "network",
    number: 8,
    section: "Basics",
    title: "Listen to Network Requests",
    tagline: "Auto-capture from fetch/XHR",
    difficulty: "Advanced",
    icon: "⇄",
    appId: APP + "-net",
    language: "javascript",
    mission: `Some platforms never touch a dataLayer — the order only exists in an **API response**. MediaJel can intercept \`fetch\`/XHR and pull the transaction straight out of the response body.

A mock order endpoint is available at **\`/mock/orders\`** (returns order-shaped JSON). **Your mission:** trigger that request — the tracker will intercept the response and forward the transaction.`,
    hints: [
      "Just fetch it: fetch('/mock/orders')",
      "The tracker's fetch source reads the JSON response and auto-detects the order.",
    ],
    starterCode: `// Your checkout backend exposes the order at /mock/orders (order-shaped JSON).
// Trigger that request — the tracker intercepts the response and reads the order.

// TODO: fetch the order endpoint`,
    solutionCode: `fetch("/mock/orders").then((r) => r.json()).then((o) => console.log(o));`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const tx = txEvent(b);
      return [
        ok("captured", "The order was intercepted from the network response", !!tx),
        ok("id", 'Transaction id is "NET-7700"', tx?.event?.tr_orderid === "NET-7700", tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`),
        ok("items", "Line item(s) carried through", txItems(b).length >= 1, `${txItems(b).length} item(s)`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 7. Iframes */
  {
    id: "iframes",
    number: 9,
    section: "Basics",
    title: "Listen to Iframes",
    tagline: "postMessage from embedded checkouts",
    difficulty: "Advanced",
    icon: "❒",
    appId: APP + "-iframe",
    language: "javascript",
    mission: `Embedded checkouts (Dutchie, Jane, Meadow…) live in an **iframe** and can't touch the parent page directly. They communicate via **\`postMessage\`**. MediaJel listens for those messages and captures the purchase.

**Your mission:** simulate the checkout iframe by posting a **\`TRAINING_PURCHASE\`** message. The tracker is listening on the window and will capture it.`,
    hints: [
      'window.postMessage({ type: "TRAINING_PURCHASE", order: { id, total, currency, items:[...] } }, "*")',
      "This is exactly what a real checkout iframe posts to its parent.",
    ],
    starterCode: `// Simulate an embedded checkout iframe by posting a TRAINING_PURCHASE message.
// The tracker is listening on the window and will capture the order.
// Use order id "IF-9900", total 250.00, currency "USD", and one item.

window.postMessage(
  {
    // TODO: type: "TRAINING_PURCHASE", order: { id, total, currency, items: [...] }
  },
  "*",
);`,
    solutionCode: `window.postMessage({ type: "TRAINING_PURCHASE", order: { id: "IF-9900", total: 250.0, currency: "USD", items: [{ sku: "IF-1", name: "Vape Cart", category: "vape", unitPrice: 125.0, quantity: 2 }] } }, "*");`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const tx = txEvent(b);
      return [
        ok("captured", "The iframe message was captured as a transaction", !!tx),
        ok("id", 'Transaction id is "IF-9900"', tx?.event?.tr_orderid === "IF-9900", tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`),
        ok("total", "Total (250.00) carried through", Number(tx?.event?.tr_total) === 250, tx?.event?.tr_total != null && `got ${tx.event.tr_total}`),
        ok("items", "Line item(s) carried through", txItems(b).length >= 1, `${txItems(b).length} item(s)`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 5. Add to cart */
  {
    id: "add-to-cart",
    number: 5,
    section: "Basics",
    title: "Track Add to Cart",
    tagline: "Cart engagement",
    difficulty: "Intermediate",
    icon: "⊕",
    appId: APP + "-atc",
    language: "javascript",
    mission: `Cart activity is a strong intent signal. After the tag loads it exposes **\`window.addToCart\`** — call it whenever a shopper adds a product.

**Your mission:** track an add-to-cart for a product with sku **\`SKU-9\`**, a name, and a price in **USD**.`,
    hints: ["window.addToCart({ sku, name, category, unitPrice, quantity, currency })"],
    starterCode: `// The tag is loaded. Track an add-to-cart with window.addToCart.
window.addToCart({
  // TODO: sku "SKU-9", name, category, unitPrice, quantity, currency "USD"
});`,
    solutionCode: `window.addToCart({ sku: "SKU-9", name: "OG Kush Eighth", category: "flower", unitPrice: 45, quantity: 1, currency: "USD" });`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const ev = findSelfDescribing(b, "add_to_cart");
      const data = ev ? unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data : null;
      return [
        ok("captured", "An add_to_cart event reached the pipeline", !!ev),
        ok("sku", 'sku is "SKU-9"', data?.sku === "SKU-9", data?.sku && `got "${data.sku}"`),
        ok("name", "A product name was tracked", !!data?.name, data?.name),
      ];
    },
  },

  /* ---------------------------------------------------------------- 6. Remove from cart */
  {
    id: "remove-from-cart",
    number: 6,
    section: "Basics",
    title: "Track Remove from Cart",
    tagline: "Cart abandonment",
    difficulty: "Intermediate",
    icon: "⊖",
    appId: APP + "-rfc",
    language: "javascript",
    mission: `The flip side of add-to-cart: when a shopper **removes** an item, the tag exposes **\`window.removeFromCart\`**. Tracking removals helps measure abandonment.

**Your mission:** track a remove-from-cart for sku **\`SKU-9\`** with a quantity.`,
    hints: ["window.removeFromCart({ sku, name, category, unitPrice, quantity, currency })"],
    starterCode: `// Track a remove-from-cart with window.removeFromCart.
window.removeFromCart({
  // TODO: sku "SKU-9", name, category, unitPrice, quantity, currency "USD"
});`,
    solutionCode: `window.removeFromCart({ sku: "SKU-9", name: "OG Kush Eighth", category: "flower", unitPrice: 45, quantity: 1, currency: "USD" });`,
    buildSandbox: (code, ctx) => jsSandbox(code, ctx, "training"),
    validate: (b) => {
      const ev = findSelfDescribing(b, "remove_from_cart");
      const data = ev ? unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data : null;
      return [
        ok("captured", "A remove_from_cart event reached the pipeline", !!ev),
        ok("sku", 'sku is "SKU-9"', data?.sku === "SKU-9", data?.sku && `got "${data.sku}"`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 10. Build an extension (Advanced) */
  {
    id: "extension",
    number: 10,
    section: "Advanced",
    title: "Build a Tracker Extension",
    tagline: "Intercept signals with (tracker) => tracker",
    difficulty: "Advanced",
    icon: "⚙",
    appId: APP + "-ext",
    language: "javascript",
    mission: `MediaJel composes the tracker from **extensions** — functions shaped \`(tracker) => tracker\` that **wrap** tracker methods to intercept signals. \`withDeduplicationExtension\`, for example, wraps \`tracker.ecommerce.trackTransaction\` to drop duplicates. They're combined with \`applyExtensions(tracker, [ext1, ext2, …])\`.

In this sandbox you register your own with **\`window.mjApplyExtension(yourExtension)\`** — it runs through the *real* \`applyExtensions\` and rebinds \`window.trackTrans\`.

**Your mission:** write an extension that intercepts every transaction and adds a **$5 "training fee"** to the total, register it, then fire a transaction with total **100** (id **\`EXT-1\`**). The pipeline should receive a total of **105**.`,
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
        ok("id", 'Transaction id is "EXT-1"', tx?.event?.tr_orderid === "EXT-1", tx?.event?.tr_orderid && `got "${tx.event.tr_orderid}"`),
        ok("intercepted", "Your extension intercepted it — total is 105 (100 + $5 fee)", Number(tx?.event?.tr_total) === 105, tx?.event?.tr_total != null && `got ${tx.event.tr_total}`),
      ];
    },
  },

  /* ---------------------------------------------------------------- 11. Frictionless custom tag (Advanced) */
  {
    id: "frictionless",
    number: 11,
    section: "Advanced",
    title: "Deploy a Frictionless Custom Tag",
    tagline: "Per-domain one-off scripts",
    difficulty: "Advanced",
    icon: "⌁",
    appId: APP + "-friction",
    language: "javascript",
    mission: `Some sites need bespoke capture the standard adapters can't do. **Frictionless custom tags** solve this: a one-off script named by the client's domain (e.g. \`a21dispensary.com.ts\`) that you deploy to S3. The tag loads it at runtime for that domain (via \`getCustomTags\`) and it hooks the site's DOM to fire events.

This sandbox renders a simulated client site with a **contact form** (name + email + a Send button).

**Your mission:** write the custom tag — hook the form's submit, read the visitor's name and email, and fire a **sign_up** self-describing event. We auto-submit the form to test it.`,
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
      const data = ev ? unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data : null;
      return [
        ok("captured", "A sign_up fired when the form was submitted", !!ev),
        ok("email", "The visitor's email was captured", !!data?.emailAddress, data?.emailAddress),
        ok("name", "The visitor's name was captured", !!data?.firstName, data?.firstName),
      ];
    },
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);

/** Lessons grouped by section, in display order. */
export const SECTIONS: { id: import("./lib/core").Section; label: string; blurb: string }[] = [
  { id: "Basics", label: "Basics", blurb: "Install the tag and capture the core events." },
  { id: "Advanced", label: "Advanced", blurb: "Extend the tracker and ship per-domain custom tags." },
];

export const lessonsBySection = (section: import("./lib/core").Section) =>
  LESSONS.filter((l) => l.section === section).sort((a, b) => a.number - b.number);
