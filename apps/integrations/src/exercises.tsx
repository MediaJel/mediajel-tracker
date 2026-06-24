/**
 * Exercises — the capstone of the Integrations trainer.
 *
 * Unlike a lesson (write code → Play once → grade), an exercise is a LIVE, interactive simulation:
 * the learner clicks through a real storefront / sign-up form rendered inside the sandbox iframe.
 * As they interact, the simulated app fires realistic effects — GA4 `dataLayer` pushes and checkout
 * network requests — exactly like a client's site. The tag is loaded with `environment=exercise`,
 * which exposes the real data sources (`window.datalayerSource`, `window.xhrResponseSource`, …) but
 * AUTO-CAPTURES NOTHING. The learner writes the capture code so each target event lands in Snowplow
 * Micro as a VALID event. Goals tick green live (polled from Micro), a timer runs, and a report is
 * produced on completion. Grading is always against Micro — never client-side state alone.
 */
import { MicroBundle, MicroGoodEvent, SandboxContext, findSelfDescribing, noBadEvents, unstructData } from "./lib/core";
import { consoleBridge } from "./lessons";

/* ------------------------------------------------------------------ model */

export interface Goal {
  id: string;
  /** Shown in the Goals rail; reused as the live Check label. */
  label: string;
  /** True once the right event(s) for this goal are present as GOOD in Micro. */
  check: (b: MicroBundle) => boolean;
}

export interface Exercise {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  /** A short, human "brief" — one bullet per line — shown above the goals. Keep it light on clues. */
  intro: string[];
  appId: string;
  /** Editor language for the code panel. Exercises author the integration HTML (tag + capture). */
  language: "html" | "javascript";
  goals: Goal[];
  starterCode: string;
  /** Build the long-lived, interactive iframe srcdoc: simulated app + tag + learner code. */
  buildSandbox: (code: string, ctx: SandboxContext) => string;
}

/**
 * The advertiser appIds for each exercise's tag. Single source of truth — referenced by the starter
 * & solution snippets, the "tracker installed" goal (which checks events carry this exact app_id),
 * and the brief. They read like a real MediaJel client account so the exercise feels like a genuine
 * integration: the learner installs Greenleaf's tag with the correct appId, the way they would on a
 * real site. The store's brand throughout the simulator is "Greenleaf".
 */
const STORE_APP_ID = "greenleaf-dispensary";
const SIGNUP_APP_ID = "greenleaf-loyalty";

/* ------------------------------------------------------------------ goal helpers */

const txEvent = (b: MicroBundle): MicroGoodEvent | undefined => b.good.find((e) => e.eventType === "transaction");
const txItems = (b: MicroBundle): MicroGoodEvent[] => b.good.filter((e) => e.eventType === "transaction_item");
/** Inner data of a captured self-describing event matching a schema fragment, or null. */
const sdData = (b: MicroBundle, fragment: string): any => {
  const ev = findSelfDescribing(b, fragment);
  if (!ev) return null;
  return unstructData(ev)?.data ?? ev.event?.unstruct_event?.data?.data ?? null;
};

/* ------------------------------------------------------------------ sandbox bridges & builders */

/**
 * Read-only "network sniffer" injected BEFORE the tag. It mirrors every dataLayer push and
 * fetch/XHR request to the parent inspector (DataLayer / Network tabs) WITHOUT consuming them —
 * each wrapper calls through to the original. This is independent of the learner's own capture
 * code; it's purely a debugging aid so they can see what the store is emitting.
 */
const snifferBridge = `
(function(){
  try {
    var dl = window.dataLayer = window.dataLayer || [];
    var _push = dl.push.bind(dl);
    dl.push = function(){ try{ for(var i=0;i<arguments.length;i++){ parent.postMessage({__mj:'datalayer',data:arguments[i]},'*'); } }catch(e){} return _push.apply(null, arguments); };
    var _fetch = window.fetch;
    if (_fetch) window.fetch = function(input, init){ try{ parent.postMessage({__mj:'network',req:{kind:'fetch',method:(init&&init.method)||'GET',url:String((input&&input.url)||input),body:(init&&init.body)?String(init.body):null}},'*'); }catch(e){} return _fetch.apply(this, arguments); };
    var _open = XMLHttpRequest.prototype.open, _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(m,u){ this.__mjReq={method:m,url:String(u)}; return _open.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function(b){ try{ var r=this.__mjReq||{}; parent.postMessage({__mj:'network',req:{kind:'xhr',method:r.method,url:r.url,body:(b!=null)?String(b):null}},'*'); }catch(e){} return _send.apply(this, arguments); };
  } catch(e){}
})();`;

/**
 * Pull the two parts of the learner's HTML apart: the tracker tag's `appId` (from a
 * `<script src="…?appId=…">`) and the inline capture JS (any `<script>` without a `src`). We can't
 * just inject their HTML verbatim — the tag's SDK loads async, so an inline `window.datalayerSource(…)`
 * would run before that global exists. Instead we load the tag ourselves and run their capture behind
 * the same ready-gate. If they wrote no `<script>` tags at all, treat the whole thing as raw JS.
 */
function parseLearnerHtml(html: string): { appId: string | null; js: string } {
  const m = html.match(/[?&]app[iI]d=([^"'&\s>]+)/);
  const appId = m ? decodeURIComponent(m[1]) : null;
  let js = "";
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(html))) js += mm[1] + "\n";
  if (!/<script/i.test(html)) js = html;
  return { appId, js };
}

/**
 * Assemble an interactive exercise iframe. The learner authors the integration HTML — the tracker
 * tag plus their capture scripts. Order is deliberate:
 *   1. pre-create window.dataLayer + console/sniffer bridges (before the tag, so push wrapping chains)
 *   2. load the LEARNER's tag (their appId, rewritten to the local tag at environment=exercise)
 *   3. define the simulated app + its effect handlers (but DON'T attach them yet)
 *   4. once the exercise globals exist, run the learner's capture JS (attaches their listeners), THEN
 *      wire the store's buttons and reveal it — so listeners are live before any click fires.
 * If no tag is found we skip the wait and reveal the store immediately (the learner sees nothing gets
 * captured — that's the cue they still need to install the tag). No auto-`done` — they drive it by hand.
 */
function buildExerciseSandbox(opts: {
  code: string;
  ctx: SandboxContext;
  styleCss: string;
  bodyHtml: string;
  setupJs: string;
}): string {
  const { code, ctx, styleCss, bodyHtml, setupJs } = opts;
  const { appId, js } = parseLearnerHtml(code);
  const tagScript = appId
    ? `<script src="${ctx.tagUrl({ appId, environment: "exercise", version: "2" })}"></script>`
    : "<!-- no tracker tag installed yet -->";
  const overrides = appId ? JSON.stringify({ [appId]: { collector: "//" + ctx.host } }) : "{}";
  return `<!doctype html><html><head><base href="${ctx.origin}/"><meta charset="utf-8">
<meta name="color-scheme" content="light">
<script>window.overrides=${overrides};window.dataLayer=window.dataLayer||[];${consoleBridge}${snifferBridge}</script>
${tagScript}
<style>${styleCss}</style>
</head><body data-loading>
${bodyHtml}
<div id="mj-loading">Loading…</div>
<script>
(function(){
  ${setupJs}
  var __hasTag = ${appId ? "true" : "false"};
  function ready(){ return !__hasTag || (typeof window.datalayerSource==='function' && typeof window.addToCart==='function'); }
  function start(){
    try { ${js} } catch(err){ parent.postMessage({__mj:'error',error:String(err&&err.message||err)},'*'); }
    try { if (typeof attachHandlers==='function') attachHandlers(); } catch(e){}
    var ld=document.getElementById('mj-loading'); if(ld) ld.parentNode.removeChild(ld);
    if (document.body) document.body.removeAttribute('data-loading');
  }
  var n=0,iv=setInterval(function(){ if(ready()){clearInterval(iv);start();} else if(++n>240){clearInterval(iv);start();} },50);
})();
</script>
</body></html>`;
}

/* ----- shared simulated-app chrome styling (self-contained; the iframe has its own document) ----- */
const BASE_CSS = `
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#16161a;background:#f4f4f7}
body[data-loading]{cursor:progress}
body[data-loading] .sim,body[data-loading] #app{opacity:.45;pointer-events:none;filter:saturate(.6)}
#mj-loading{position:fixed;left:50%;top:12px;transform:translateX(-50%);background:#111;color:#fff;font-size:12px;padding:6px 12px;border-radius:999px;opacity:.85;z-index:10}
.sim{height:100%;display:flex;flex-direction:column;padding:16px;gap:14px}
.sim-head{display:flex;align-items:center;justify-content:space-between}
.brand{font-weight:700;font-size:15px}
.brand span{color:#8a8a96;font-weight:500}
.tag{font-size:11px;color:#6a6a76;background:#fff;border:1px solid #e7e7ee;padding:4px 9px;border-radius:999px}
.btn{appearance:none;border:0;border-radius:10px;padding:8px 14px;font-weight:600;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#16a34a,#0e9f6e);color:#fff;transition:filter .15s,transform .05s}
.btn:hover{filter:brightness(1.07)}
.btn:active{transform:scale(.98)}
.btn[disabled]{opacity:.45;cursor:not-allowed;filter:grayscale(.4)}
.btn-ghost{background:#fff;color:#16161a;border:1px solid #e2e2ea}
`;

/* ====================================================================== ecommerce store */

const STORE_CSS =
  BASE_CSS +
  `
#app{height:100%;display:flex;flex-direction:column;background:#fff;overflow:hidden}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:13px 22px;border-bottom:1px solid #ececf2;background:#fff}
.hdr .brand{cursor:pointer;font-weight:800;font-size:17px;color:#15803d}
.hdr-nav{display:flex;align-items:center;gap:16px}
.link{background:none;border:0;color:#15803d;cursor:pointer;font-size:13px;font-weight:600;padding:0}
.cart-btn{display:flex;align-items:center;gap:7px;background:#f1f5f3;border:1px solid #e2e8e4;border-radius:999px;padding:7px 14px;font-weight:600;font-size:13px;cursor:pointer;color:#16161a}
.badge{background:#16a34a;color:#fff;border-radius:999px;min-width:18px;height:18px;display:inline-grid;place-items:center;font-size:11px;padding:0 5px}
.scroll{flex:1;overflow:auto;min-height:0}
.page{max-width:940px;margin:0 auto;padding:22px 22px 44px}
.promo{background:linear-gradient(120deg,#dcfce7,#d1fae5);border:1px solid #bbf7d0;border-radius:14px;padding:15px 18px;font-weight:700;color:#14532d;margin-bottom:18px}
.promo span{display:block;font-weight:500;font-size:13px;color:#3f6212;margin-top:2px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
.card{background:#fff;border:1px solid #ececf2;border-radius:16px;padding:14px;cursor:pointer;display:flex;flex-direction:column;gap:7px;transition:box-shadow .15s,transform .06s}
.card:hover{box-shadow:0 10px 26px rgba(0,0,0,.08);transform:translateY(-2px)}
.thumb{height:104px;border-radius:12px;background:linear-gradient(135deg,#e8f6ee,#d6efe0);display:grid;place-items:center;font-size:46px}
.cat{font-size:11px;color:#8a8a96;text-transform:uppercase;letter-spacing:.04em}
.name{font-weight:600;font-size:14px;line-height:1.3}
.row{display:flex;align-items:center;justify-content:space-between;margin-top:auto}
.price{font-weight:800;font-size:15px}
.btn.sm{padding:6px 12px;font-size:12px}
.btn.lg{padding:11px 20px;font-size:15px}
.btn.block{width:100%}
.back{background:none;border:0;color:#15803d;font-weight:600;cursor:pointer;font-size:13px;margin-bottom:16px;padding:4px 0}
.pdp{display:grid;grid-template-columns:320px 1fr;gap:28px}
.pdp-img{height:280px;border-radius:18px;background:linear-gradient(135deg,#e8f6ee,#d6efe0);display:grid;place-items:center;font-size:120px}
.pdp-info h1{margin:6px 0 2px;font-size:26px;line-height:1.15}
.pdp-price{font-size:22px;font-weight:800;margin:10px 0}
.desc{color:#52525b;line-height:1.65;font-size:14px}
.qty{display:flex;align-items:center;gap:9px;margin:18px 0;font-size:13px;font-weight:600;color:#52525b}
.qty input{width:66px;padding:8px 10px;border:1px solid #e2e2ea;border-radius:8px;font:inherit}
.added{margin-top:14px;color:#15803d;font-size:13px;font-weight:600}
.ph{font-size:24px;margin:0 0 18px}
.citem{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #f0f0f4}
.ci-thumb{height:56px;width:56px;border-radius:11px;background:linear-gradient(135deg,#e8f6ee,#d6efe0);display:grid;place-items:center;font-size:26px;flex-shrink:0}
.ci-name{font-weight:600;font-size:14px}
.ci-meta{font-size:12px;color:#8a8a96;margin-top:2px}
.ci-price{margin-left:auto;font-weight:700}
.rm{background:none;border:0;color:#dc2626;cursor:pointer;font-weight:700;font-size:18px;padding:0 4px;line-height:1}
.summary{margin-top:18px;max-width:300px;margin-left:auto}
.srow{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:14px;color:#52525b}
.srow.total{border-top:1px solid #e5e5ea;margin-top:6px;padding-top:10px;font-weight:800;font-size:16px;color:#16161a}
.empty{color:#9a9aa6;padding:44px 0;text-align:center;line-height:2}
.co-grid{display:grid;grid-template-columns:1fr 320px;gap:26px;align-items:start}
.co-form h2{font-size:16px;margin:20px 0 12px;display:flex;align-items:center;gap:9px}
.co-form h2:first-child{margin-top:0}
.co-form label{display:block;font-size:11px;font-weight:600;color:#6a6a76;margin-bottom:10px;text-transform:uppercase;letter-spacing:.03em}
.co-form input{display:block;width:100%;margin-top:5px;padding:10px 12px;border:1px solid #e2e2ea;border-radius:9px;font:inherit;font-weight:400;color:#16161a;text-transform:none;letter-spacing:0}
.co-form input:focus{outline:2px solid #16a34a33;border-color:#16a34a}
.frow{display:flex;gap:11px}
.frow label{flex:1}
.testpill{font-size:10px;font-weight:600;color:#9a6a00;background:#fef3c7;border:1px solid #fde68a;padding:2px 8px;border-radius:999px;text-transform:none;letter-spacing:0}
.co-summary{background:#fafafa;border:1px solid #ececf2;border-radius:14px;padding:18px}
.co-summary h2{font-size:15px;margin:0 0 12px}
.secure{font-size:11px;color:#8a8a96;text-align:center;margin-top:11px}
.thanks{text-align:center;padding-top:38px}
.thanks .check{height:66px;width:66px;border-radius:999px;background:#16a34a;color:#fff;font-size:34px;display:grid;place-items:center;margin:0 auto 18px}
.thanks h1{font-size:27px;margin:0 0 8px}
.thanks p{color:#52525b;max-width:440px;margin:0 auto}
.receipt{max-width:380px;margin:22px auto 24px;text-align:left;background:#fafafa;border:1px solid #ececf2;border-radius:12px;padding:16px 18px}
.toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(18px);background:#16161a;color:#fff;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;opacity:0;transition:all .25s;pointer-events:none;z-index:20}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
`;

const STORE_BODY = `<div id="app"></div><div id="toast" class="toast"></div>`;

// NOTE: ES5 only (this runs raw in the iframe, NOT compiled by Parcel). No arrow fns / let / template literals.
// A small client-side store with real pages (catalog → product → cart → checkout → thank-you). The
// tracked effects fire at natural moments: view_item on a product page, add/remove on cart actions,
// and the order POST to /api/checkout when the purchase is confirmed.
const STORE_SETUP = `
var PRODUCTS = [
  { id: "SKU-OG", name: "OG Kush — Eighth", category: "flower", price: 45, emoji: "🌿", desc: "A classic indica-dominant hybrid with earthy pine notes and a mellow, full-body calm. Lab-tested, 3.5g." },
  { id: "SKU-GU", name: "Mango Gummies 100mg", category: "edibles", price: 22, emoji: "🍬", desc: "Ten 10mg mango gummies — vegan, gluten-free and precisely dosed for an easy, even ride." },
  { id: "SKU-VP", name: "Live Resin Vape", category: "vape", price: 55, emoji: "💨", desc: "Full-spectrum live-resin cartridge with bright citrus terpenes. 510-thread, 1g." },
  { id: "SKU-PR", name: "Sativa Pre-Roll 2pk", category: "flower", price: 18, emoji: "🚬", desc: "Two half-gram pre-rolls of an uplifting daytime sativa. Ready when you are." },
  { id: "SKU-TI", name: "CBD Relief Tincture", category: "wellness", price: 38, emoji: "🧴", desc: "1000mg broad-spectrum CBD oil with a peppermint finish. Fast-acting and THC-free." },
  { id: "SKU-CH", name: "Dark Chocolate Bar", category: "edibles", price: 25, emoji: "🍫", desc: "Single-origin 70% dark chocolate — 100mg total across twelve even squares." }
];
var cart = {};
var route = "catalog";
var current = null;
var justAdded = false;
var lastOrder = null;

function money(n){ return "$" + Number(n).toFixed(2); }
function round(n){ return Math.round(n*100)/100; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function findP(id){ for (var i=0;i<PRODUCTS.length;i++){ if (PRODUCTS[i].id===id) return PRODUCTS[i]; } return null; }
function ga4Item(p, qty){ return { item_id: p.id, item_name: p.name, item_category: p.category, price: p.price, quantity: qty }; }
function pushDL(obj){ (window.dataLayer = window.dataLayer || []).push(obj); }
function cartLines(){ var L=[]; for (var id in cart){ if (cart[id]>0){ L.push({ p: findP(id), qty: cart[id] }); } } return L; }
function cartSub(){ var t=0, L=cartLines(); for (var i=0;i<L.length;i++){ t += L[i].p.price * L[i].qty; } return round(t); }
function cartCount(){ var c=0; for (var id in cart){ c += cart[id]; } return c; }
function shipFor(sub){ return (sub>=75 || sub===0) ? 0 : 7.5; }
function taxFor(sub){ return round(sub*0.08); }

function toast(msg){
  var t=document.getElementById("toast"); if(!t) return;
  t.textContent = msg; t.className = "toast show";
  if (window.__tt) clearTimeout(window.__tt);
  window.__tt = setTimeout(function(){ t.className = "toast"; }, 1600);
}

function header(){
  return '<header class="hdr"><div class="brand" data-action="home">🌿 Greenleaf</div>'
    + '<nav class="hdr-nav"><button class="link" data-action="home">Shop</button>'
    + '<button class="cart-btn" data-action="cart">🛒 Cart <span class="badge">'+cartCount()+'</span></button></nav></header>';
}
function catalogView(){
  var cards = "";
  for (var i=0;i<PRODUCTS.length;i++){
    var p = PRODUCTS[i];
    cards += '<div class="card" data-action="view" data-id="'+p.id+'">'
      + '<div class="thumb">'+p.emoji+'</div>'
      + '<div class="cat">'+esc(p.category)+'</div><div class="name">'+esc(p.name)+'</div>'
      + '<div class="row"><span class="price">'+money(p.price)+'</span>'
      + '<button class="btn sm" data-action="add" data-id="'+p.id+'">Add</button></div></div>';
  }
  return '<div class="page"><div class="promo">Premium cannabis, delivered.<span>Free same-day delivery on orders over $75.</span></div>'
    + '<div class="grid">'+cards+'</div></div>';
}
function productView(p){
  if(!p) return catalogView();
  return '<div class="page"><button class="back" data-action="home">← Back to shop</button>'
    + '<div class="pdp"><div class="pdp-img">'+p.emoji+'</div><div class="pdp-info">'
    + '<div class="cat">'+esc(p.category)+'</div><h1>'+esc(p.name)+'</h1>'
    + '<div class="pdp-price">'+money(p.price)+'</div><p class="desc">'+esc(p.desc)+'</p>'
    + '<div class="qty">Qty <input id="qty" type="number" min="1" value="1"></div>'
    + '<button class="btn lg" data-action="add" data-id="'+p.id+'">Add to cart</button>'
    + (justAdded ? '<div class="added">✓ Added to your cart — <button class="link" data-action="cart">view cart</button></div>' : '')
    + '</div></div></div>';
}
function cartView(){
  var L = cartLines();
  if (!L.length) return '<div class="page"><h1 class="ph">Your cart</h1><div class="empty">Your cart is empty.<button class="link" data-action="home">Keep shopping →</button></div></div>';
  var rows = "";
  for (var i=0;i<L.length;i++){ var x=L[i];
    rows += '<div class="citem"><div class="ci-thumb">'+x.p.emoji+'</div><div><div class="ci-name">'+esc(x.p.name)+'</div>'
      + '<div class="ci-meta">'+esc(x.p.category)+' · '+money(x.p.price)+' each</div></div>'
      + '<div class="ci-price">'+money(x.p.price*x.qty)+' <span style="color:#8a8a96;font-weight:500">×'+x.qty+'</span></div>'
      + '<button class="rm" data-action="remove" data-id="'+x.p.id+'" title="Remove">×</button></div>';
  }
  var sub = cartSub();
  return '<div class="page"><h1 class="ph">Your cart</h1>'+rows
    + '<div class="summary"><div class="srow"><span>Subtotal</span><span>'+money(sub)+'</span></div>'
    + '<div class="srow"><span>Shipping</span><span>'+(shipFor(sub)===0?"Free":money(shipFor(sub)))+'</span></div>'
    + '<div class="srow total"><span>Total</span><span>'+money(round(sub+shipFor(sub)+taxFor(sub)))+'</span></div></div>'
    + '<div style="text-align:right;margin-top:16px"><button class="btn lg" data-action="checkout">Checkout →</button></div></div>';
}
function fld(label, f, val){ return '<label>'+label+'<input data-f="'+f+'" value="'+esc(val)+'"></label>'; }
function checkoutView(){
  var L = cartLines(); if(!L.length){ route="catalog"; return catalogView(); }
  var sub=cartSub(), ship=shipFor(sub), tax=taxFor(sub), total=round(sub+ship+tax);
  var sum = "";
  for (var i=0;i<L.length;i++){ var x=L[i]; sum += '<div class="srow"><span>'+esc(x.p.name)+' ×'+x.qty+'</span><span>'+money(x.p.price*x.qty)+'</span></div>'; }
  return '<div class="page"><button class="back" data-action="cart">← Back to cart</button>'
    + '<div class="co-grid"><div class="co-form">'
    + '<h2>Shipping details</h2>'
    + '<div class="frow">'+fld("First name","firstName","Ada")+fld("Last name","lastName","Lovelace")+'</div>'
    + fld("Email","email","ada@example.com") + fld("Address","address","1 Infinite Loop")
    + '<div class="frow">'+fld("City","city","Denver")+fld("State","state","CO")+fld("ZIP","zip","80202")+'</div>'
    + '<h2>Payment <span class="testpill">test mode · no real charge</span></h2>'
    + fld("Card number","card","4242 4242 4242 4242")
    + '<div class="frow">'+fld("Expiry","exp","12 / 28")+fld("CVC","cvc","123")+'</div>'
    + '</div><aside class="co-summary"><h2>Order summary</h2>'+sum
    + '<div class="srow"><span>Shipping</span><span>'+(ship===0?"Free":money(ship))+'</span></div>'
    + '<div class="srow"><span>Tax</span><span>'+money(tax)+'</span></div>'
    + '<div class="srow total"><span>Total</span><span>'+money(total)+'</span></div>'
    + '<button class="btn lg block" data-action="place-order" style="margin-top:14px">Pay '+money(total)+'</button>'
    + '<div class="secure">🔒 Secure checkout (simulated)</div></aside></div></div>';
}
function thankYouView(o){
  if(!o) return catalogView();
  var rows = "";
  for (var i=0;i<o.items.length;i++){ var it=o.items[i]; rows += '<div class="srow"><span>'+esc(it.name)+' ×'+it.quantity+'</span><span>'+money(it.unitPrice*it.quantity)+'</span></div>'; }
  return '<div class="page thanks"><div class="check">✓</div><h1>Thank you, '+esc(o.customer.firstName)+'!</h1>'
    + '<p>Order <b>'+esc(o.id)+'</b> is confirmed. A receipt is on its way to '+esc(o.customer.email)+'.</p>'
    + '<div class="receipt">'+rows+'<div class="srow total"><span>Total paid</span><span>'+money(o.total)+'</span></div></div>'
    + '<button class="btn lg" data-action="home">Continue shopping</button></div>';
}
function pageHtml(){
  if (route==="product") return productView(current);
  if (route==="cart") return cartView();
  if (route==="checkout") return checkoutView();
  if (route==="thankyou") return thankYouView(lastOrder);
  return catalogView();
}
function render(){
  var app = document.getElementById("app"); if(!app) return;
  app.innerHTML = header() + '<div class="scroll">' + pageHtml() + '</div>';
}

function onClick(e){
  var el = e.target;
  while (el && el.getAttribute && !el.getAttribute("data-action")) el = el.parentNode;
  if (!el || !el.getAttribute) return;
  var action = el.getAttribute("data-action"), id = el.getAttribute("data-id");
  if (action === "home"){ route="catalog"; current=null; justAdded=false; render(); }
  else if (action === "cart"){ route="cart"; render(); }
  else if (action === "checkout"){ route="checkout"; render(); }
  else if (action === "view"){ current=findP(id); justAdded=false; route="product"; pushDL({ event: "view_item", ecommerce: { currency: "USD", items: [ga4Item(current,1)] } }); render(); }
  else if (action === "add"){
    var p = findP(id); if(!p) return;
    var qty = 1; var q = document.getElementById("qty"); if(q){ qty = parseInt(q.value,10)||1; if(qty<1) qty=1; }
    cart[p.id] = (cart[p.id]||0) + qty;
    pushDL({ event: "add_to_cart", ecommerce: { currency: "USD", items: [ga4Item(p,qty)] } });
    justAdded = true; toast("Added to cart"); render();
  }
  else if (action === "remove"){
    var rp = findP(id); var had = cart[id]||0; if(!had) return;
    delete cart[id];
    pushDL({ event: "remove_from_cart", ecommerce: { currency: "USD", items: [ga4Item(rp,had)] } });
    toast("Removed from cart"); render();
  }
  else if (action === "place-order"){
    var L = cartLines(); if(!L.length) return;
    var get = function(f){ var x=document.querySelector('[data-f="'+f+'"]'); return x?x.value:""; };
    var sub=cartSub(), ship=shipFor(sub), tax=taxFor(sub), total=round(sub+ship+tax);
    // The order POSTed to the "backend". NOTE: card details are never sent to analytics — only the order.
    var order = {
      id: "EX-" + Date.now(), total: total, tax: tax, shipping: ship, currency: "USD",
      city: get("city"), state: get("state"), country: "USA",
      customer: { firstName: get("firstName"), lastName: get("lastName"), email: get("email") },
      items: L.map(function(x){ return { sku: x.p.id, name: x.p.name, category: x.p.category, unitPrice: x.p.price, quantity: x.qty }; })
    };
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/checkout");
    xhr.setRequestHeader("content-type", "application/json");
    xhr.send(JSON.stringify(order));
    lastOrder = order; cart = {}; route = "thankyou"; render();
  }
}
function attachHandlers(){ document.addEventListener("click", onClick); }
render();
`;

const ECOMMERCE_STARTER = `<!-- 1 · Install the MediaJel tracker on Greenleaf's store. Use their appId: ${STORE_APP_ID}. -->
<script src="https://tags.cnna.io/?appId=${STORE_APP_ID}"></script>

<!-- 2 · Capture the store's conversions. Once the tag loads it exposes, on window:
       datalayerSource(fn)    -> fn(entry) for every dataLayer.push (add_to_cart, remove_from_cart, view_item…)
       xhrResponseSource(fn)  -> fn(xhr)   for every XHR that loads  (the checkout POST to /api/checkout)
     Emit with: window.addToCart(...) / window.removeFromCart(...) / window.trackTrans(...)
     Tip: the store also fires "view_item" — you don't need those here. -->
<script>
  window.datalayerSource(function (entry) {
    // TODO: when entry.event is "add_to_cart" / "remove_from_cart", read entry.ecommerce.items[0]
    // and forward it with window.addToCart({ sku, name, category, unitPrice, quantity, currency }).
  });

  window.xhrResponseSource(function (xhr) {
    // TODO: when xhr.responseURL is the /api/checkout call, JSON.parse(xhr.responseText) and forward
    // it with window.trackTrans({ id, total, currency, items: [{ sku, name, category, unitPrice, quantity, orderId, currency }] }).
  });
</script>`;

/* ====================================================================== sign-up form */

const FORM_CSS =
  BASE_CSS +
  `
.signup{max-width:420px;margin:auto;width:100%}
.fcard{background:#fff;border:1px solid #ececf2;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:11px}
.fcard h2{margin:0;font-size:18px}
.fcard p{margin:0 0 4px;color:#8a8a96;font-size:13px}
.frow{display:flex;gap:10px}
.field{flex:1;display:flex;flex-direction:column;gap:4px}
.field label{font-size:11px;font-weight:600;color:#6a6a76}
.field input{border:1px solid #e2e2ea;border-radius:9px;padding:9px 11px;font-size:13px;font-family:inherit}
.field input:focus{outline:2px solid #16a34a44;border-color:#16a34a}
.done{color:#16a34a;font-size:13px;font-weight:600;text-align:center;display:none}
`;

const FORM_BODY = `
<div class="sim">
  <div class="sim-head">
    <div class="brand">🌿 Greenleaf <span>· create account</span></div>
    <div class="tag" id="hint">Fill it in, then Create account</div>
  </div>
  <div class="signup sim-inner">
    <div class="fcard">
      <h2>Join the loyalty club</h2>
      <p>Sign up to earn points on every order.</p>
      <div class="frow">
        <div class="field"><label>First name</label><input data-field="firstName" value="Ada"></div>
        <div class="field"><label>Last name</label><input data-field="lastName" value="Lovelace"></div>
      </div>
      <div class="field"><label>Email</label><input data-field="email" value="ada@example.com"></div>
      <div class="frow">
        <div class="field"><label>Phone</label><input data-field="phone" value="+13055551234"></div>
        <div class="field"><label>State</label><input data-field="state" value="CO"></div>
      </div>
      <button class="btn" data-action="submit">Create account</button>
      <div class="done" id="done">✓ Account created — sign_up posted</div>
    </div>
  </div>
</div>`;

const FORM_SETUP = `
function fval(name){ var el = document.querySelector('[data-field="'+name+'"]'); return el ? el.value : ""; }
function pushDL(obj){ (window.dataLayer = window.dataLayer || []).push(obj); }
function submitForm(){
  var email = fval("email");
  var user = {
    uuid: email, firstName: fval("firstName"), lastName: fval("lastName"),
    emailAddress: email, hashedEmailAddress: email, phoneNumber: fval("phone"), state: fval("state")
  };
  pushDL({ event: "sign_up", user: user });
  var xhr = new XMLHttpRequest(); xhr.open("POST", "/api/signup"); xhr.setRequestHeader("content-type", "application/json"); xhr.send(JSON.stringify(user));
  var done = document.getElementById("done"); if (done) done.style.display = "block";
  var h = document.getElementById("hint"); if (h) h.textContent = "Submitted — sign_up on dataLayer + /api/signup";
}
function onClick(e){
  var el = e.target;
  while (el && el.getAttribute && !el.getAttribute("data-action")) el = el.parentNode;
  if (el && el.getAttribute && el.getAttribute("data-action") === "submit"){ e.preventDefault(); submitForm(); }
}
function attachHandlers(){ document.addEventListener("click", onClick); }
`;

const SIGNUP_STARTER = `<!-- 1 · Install the MediaJel tracker. Use Greenleaf's appId: ${SIGNUP_APP_ID}. -->
<script src="https://tags.cnna.io/?appId=${SIGNUP_APP_ID}"></script>

<!-- 2 · On submit the form pushes { event: "sign_up", user } to the dataLayer (and POSTs /api/signup).
     Capture it and fire the self-describing sign_up event with the raw API:
       window.tracker("trackSelfDescribingEvent", { event: { schema, data } })
       schema: iglu:com.mediajel.events/sign_up/jsonschema/1-0-2 -->
<script>
  window.datalayerSource(function (entry) {
    if (!entry || entry.event !== "sign_up") return;
    var u = entry.user || {};
    // TODO: window.tracker("trackSelfDescribingEvent", { event: { schema: "...sign_up/jsonschema/1-0-2",
    //        data: { uuid, firstName, lastName, emailAddress, hashedEmailAddress, phoneNumber, state } } })
  });
</script>`;

/* ====================================================================== exercises */

export const EXERCISES: Exercise[] = [
  {
    id: "ecommerce",
    title: "E-commerce tracking",
    tagline: "Instrument a live storefront",
    icon: "🛒",
    appId: STORE_APP_ID,
    language: "html",
    intro: [
      "You're wiring up tracking for Greenleaf Dispensary's online store.",
      `Install their tag — appId ${STORE_APP_ID} — then make every conversion below reach Snowplow Micro.`,
      "Shop like a customer would: browse, add, remove, check out.",
      "Stuck? Crack open the Inspector and watch what the page is doing.",
    ],
    goals: [
      {
        id: "installed",
        label: "Greenleaf's tracker is installed (right appId)",
        check: (b) => b.good.some((e) => e.eventType === "page_view" && e.event?.app_id === STORE_APP_ID),
      },
      {
        id: "add_to_cart",
        label: "Capture add to cart",
        check: (b) => !!findSelfDescribing(b, "add_to_cart"),
      },
      {
        id: "remove_from_cart",
        label: "Capture remove from cart",
        check: (b) => !!findSelfDescribing(b, "remove_from_cart"),
      },
      {
        id: "transaction",
        label: "Capture the purchase",
        check: (b) => !!txEvent(b),
      },
      {
        id: "transaction_item",
        label: "Purchase line items carried through",
        check: (b) => txItems(b).length >= 1,
      },
      {
        id: "valid",
        label: "Every event is valid (none quarantined)",
        check: (b) => b.counts.total > 0 && noBadEvents(b),
      },
    ],
    starterCode: ECOMMERCE_STARTER,
    buildSandbox: (code, ctx) =>
      buildExerciseSandbox({ code, ctx, styleCss: STORE_CSS, bodyHtml: STORE_BODY, setupJs: STORE_SETUP }),
  },
  {
    id: "signup",
    title: "Sign up form",
    tagline: "Track a registration conversion",
    icon: "✦",
    appId: SIGNUP_APP_ID,
    language: "html",
    intro: [
      "Greenleaf's loyalty sign-up — new members aren't being tracked yet.",
      `Install their tag — appId ${SIGNUP_APP_ID} — then get the sign-up into Snowplow Micro.`,
      "Fill it out like a new customer and create the account.",
      "Stuck? Crack open the Inspector and watch what the page is doing.",
    ],
    goals: [
      {
        id: "installed",
        label: "Greenleaf's tracker is installed (right appId)",
        check: (b) => b.good.some((e) => e.eventType === "page_view" && e.event?.app_id === SIGNUP_APP_ID),
      },
      {
        id: "captured",
        label: "Capture the sign_up event",
        check: (b) => !!findSelfDescribing(b, "sign_up"),
      },
      {
        id: "email",
        label: "emailAddress is mapped",
        check: (b) => !!sdData(b, "sign_up")?.emailAddress,
      },
      {
        id: "uuid",
        label: "uuid is mapped",
        check: (b) => !!sdData(b, "sign_up")?.uuid,
      },
      {
        id: "valid",
        label: "The sign_up validates (none quarantined)",
        check: (b) => b.counts.total > 0 && noBadEvents(b),
      },
    ],

    starterCode: SIGNUP_STARTER,
    buildSandbox: (code, ctx) =>
      buildExerciseSandbox({ code, ctx, styleCss: FORM_CSS, bodyHtml: FORM_BODY, setupJs: FORM_SETUP }),
  },
];

export const exerciseById = (id: string): Exercise | undefined => EXERCISES.find((e) => e.id === id);
