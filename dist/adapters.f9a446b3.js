// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (modules, entry, mainEntry, parcelRequireName, globalName) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        this
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      return res === false ? {} : newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });

      // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }
})({"ed2Dz":[function(require,module,exports) {
var global = arguments[3];
var HMR_HOST = null;
var HMR_PORT = 1235;
var HMR_SECURE = false;
var HMR_ENV_HASH = "3c2b99c082dbaa39";
var HMR_USE_SSE = false;
module.bundle.HMR_BUNDLE_ID = "2bdaec64f9a446b3";
"use strict";
/* global HMR_HOST, HMR_PORT, HMR_ENV_HASH, HMR_SECURE, HMR_USE_SSE, chrome, browser, __parcel__import__, __parcel__importScripts__, ServiceWorkerGlobalScope */ /*::
import type {
  HMRAsset,
  HMRMessage,
} from '@parcel/reporter-dev-server/src/HMRServer.js';
interface ParcelRequire {
  (string): mixed;
  cache: {|[string]: ParcelModule|};
  hotData: {|[string]: mixed|};
  Module: any;
  parent: ?ParcelRequire;
  isParcelRequire: true;
  modules: {|[string]: [Function, {|[string]: string|}]|};
  HMR_BUNDLE_ID: string;
  root: ParcelRequire;
}
interface ParcelModule {
  hot: {|
    data: mixed,
    accept(cb: (Function) => void): void,
    dispose(cb: (mixed) => void): void,
    // accept(deps: Array<string> | string, cb: (Function) => void): void,
    // decline(): void,
    _acceptCallbacks: Array<(Function) => void>,
    _disposeCallbacks: Array<(mixed) => void>,
  |};
}
interface ExtensionContext {
  runtime: {|
    reload(): void,
    getURL(url: string): string;
    getManifest(): {manifest_version: number, ...};
  |};
}
declare var module: {bundle: ParcelRequire, ...};
declare var HMR_HOST: string;
declare var HMR_PORT: string;
declare var HMR_ENV_HASH: string;
declare var HMR_SECURE: boolean;
declare var HMR_USE_SSE: boolean;
declare var chrome: ExtensionContext;
declare var browser: ExtensionContext;
declare var __parcel__import__: (string) => Promise<void>;
declare var __parcel__importScripts__: (string) => Promise<void>;
declare var globalThis: typeof self;
declare var ServiceWorkerGlobalScope: Object;
*/ var OVERLAY_ID = "__parcel__error__overlay__";
var OldModule = module.bundle.Module;
function Module(moduleName) {
    OldModule.call(this, moduleName);
    this.hot = {
        data: module.bundle.hotData[moduleName],
        _acceptCallbacks: [],
        _disposeCallbacks: [],
        accept: function(fn) {
            this._acceptCallbacks.push(fn || function() {});
        },
        dispose: function(fn) {
            this._disposeCallbacks.push(fn);
        }
    };
    module.bundle.hotData[moduleName] = undefined;
}
module.bundle.Module = Module;
module.bundle.hotData = {};
var checkedAssets /*: {|[string]: boolean|} */ , assetsToDispose /*: Array<[ParcelRequire, string]> */ , assetsToAccept /*: Array<[ParcelRequire, string]> */ ;
function getHostname() {
    return HMR_HOST || (location.protocol.indexOf("http") === 0 ? location.hostname : "localhost");
}
function getPort() {
    return HMR_PORT || location.port;
}
// eslint-disable-next-line no-redeclare
var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== "undefined") {
    var hostname = getHostname();
    var port = getPort();
    var protocol = HMR_SECURE || location.protocol == "https:" && ![
        "localhost",
        "127.0.0.1",
        "0.0.0.0"
    ].includes(hostname) ? "wss" : "ws";
    var ws;
    if (HMR_USE_SSE) ws = new EventSource("/__parcel_hmr");
    else try {
        ws = new WebSocket(protocol + "://" + hostname + (port ? ":" + port : "") + "/");
    } catch (err) {
        if (err.message) console.error(err.message);
        ws = {};
    }
    // Web extension context
    var extCtx = typeof browser === "undefined" ? typeof chrome === "undefined" ? null : chrome : browser;
    // Safari doesn't support sourceURL in error stacks.
    // eval may also be disabled via CSP, so do a quick check.
    var supportsSourceURL = false;
    try {
        (0, eval)('throw new Error("test"); //# sourceURL=test.js');
    } catch (err) {
        supportsSourceURL = err.stack.includes("test.js");
    }
    // $FlowFixMe
    ws.onmessage = async function(event /*: {data: string, ...} */ ) {
        checkedAssets = {} /*: {|[string]: boolean|} */ ;
        assetsToAccept = [];
        assetsToDispose = [];
        var data /*: HMRMessage */  = JSON.parse(event.data);
        if (data.type === "update") {
            // Remove error overlay if there is one
            if (typeof document !== "undefined") removeErrorOverlay();
            let assets = data.assets.filter((asset)=>asset.envHash === HMR_ENV_HASH);
            // Handle HMR Update
            let handled = assets.every((asset)=>{
                return asset.type === "css" || asset.type === "js" && hmrAcceptCheck(module.bundle.root, asset.id, asset.depsByBundle);
            });
            if (handled) {
                console.clear();
                // Dispatch custom event so other runtimes (e.g React Refresh) are aware.
                if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") window.dispatchEvent(new CustomEvent("parcelhmraccept"));
                await hmrApplyUpdates(assets);
                // Dispose all old assets.
                let processedAssets = {} /*: {|[string]: boolean|} */ ;
                for(let i = 0; i < assetsToDispose.length; i++){
                    let id = assetsToDispose[i][1];
                    if (!processedAssets[id]) {
                        hmrDispose(assetsToDispose[i][0], id);
                        processedAssets[id] = true;
                    }
                }
                // Run accept callbacks. This will also re-execute other disposed assets in topological order.
                processedAssets = {};
                for(let i = 0; i < assetsToAccept.length; i++){
                    let id = assetsToAccept[i][1];
                    if (!processedAssets[id]) {
                        hmrAccept(assetsToAccept[i][0], id);
                        processedAssets[id] = true;
                    }
                }
            } else fullReload();
        }
        if (data.type === "error") {
            // Log parcel errors to console
            for (let ansiDiagnostic of data.diagnostics.ansi){
                let stack = ansiDiagnostic.codeframe ? ansiDiagnostic.codeframe : ansiDiagnostic.stack;
                console.error("\uD83D\uDEA8 [parcel]: " + ansiDiagnostic.message + "\n" + stack + "\n\n" + ansiDiagnostic.hints.join("\n"));
            }
            if (typeof document !== "undefined") {
                // Render the fancy html overlay
                removeErrorOverlay();
                var overlay = createErrorOverlay(data.diagnostics.html);
                // $FlowFixMe
                document.body.appendChild(overlay);
            }
        }
    };
    if (ws instanceof WebSocket) {
        ws.onerror = function(e) {
            if (e.message) console.error(e.message);
        };
        ws.onclose = function() {
            console.warn("[parcel] \uD83D\uDEA8 Connection to the HMR server was lost");
        };
    }
}
function removeErrorOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
        console.log("[parcel] \u2728 Error resolved");
    }
}
function createErrorOverlay(diagnostics) {
    var overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    let errorHTML = '<div style="background: black; opacity: 0.85; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; font-family: Menlo, Consolas, monospace; z-index: 9999;">';
    for (let diagnostic of diagnostics){
        let stack = diagnostic.frames.length ? diagnostic.frames.reduce((p, frame)=>{
            return `${p}
<a href="/__parcel_launch_editor?file=${encodeURIComponent(frame.location)}" style="text-decoration: underline; color: #888" onclick="fetch(this.href); return false">${frame.location}</a>
${frame.code}`;
        }, "") : diagnostic.stack;
        errorHTML += `
      <div>
        <div style="font-size: 18px; font-weight: bold; margin-top: 20px;">
          \u{1F6A8} ${diagnostic.message}
        </div>
        <pre>${stack}</pre>
        <div>
          ${diagnostic.hints.map((hint)=>"<div>\uD83D\uDCA1 " + hint + "</div>").join("")}
        </div>
        ${diagnostic.documentation ? `<div>\u{1F4DD} <a style="color: violet" href="${diagnostic.documentation}" target="_blank">Learn more</a></div>` : ""}
      </div>
    `;
    }
    errorHTML += "</div>";
    overlay.innerHTML = errorHTML;
    return overlay;
}
function fullReload() {
    if ("reload" in location) location.reload();
    else if (extCtx && extCtx.runtime && extCtx.runtime.reload) extCtx.runtime.reload();
}
function getParents(bundle, id) /*: Array<[ParcelRequire, string]> */ {
    var modules = bundle.modules;
    if (!modules) return [];
    var parents = [];
    var k, d, dep;
    for(k in modules)for(d in modules[k][1]){
        dep = modules[k][1][d];
        if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) parents.push([
            bundle,
            k
        ]);
    }
    if (bundle.parent) parents = parents.concat(getParents(bundle.parent, id));
    return parents;
}
function updateLink(link) {
    var href = link.getAttribute("href");
    if (!href) return;
    var newLink = link.cloneNode();
    newLink.onload = function() {
        if (link.parentNode !== null) // $FlowFixMe
        link.parentNode.removeChild(link);
    };
    newLink.setAttribute("href", // $FlowFixMe
    href.split("?")[0] + "?" + Date.now());
    // $FlowFixMe
    link.parentNode.insertBefore(newLink, link.nextSibling);
}
var cssTimeout = null;
function reloadCSS() {
    if (cssTimeout) return;
    cssTimeout = setTimeout(function() {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        for(var i = 0; i < links.length; i++){
            // $FlowFixMe[incompatible-type]
            var href /*: string */  = links[i].getAttribute("href");
            var hostname = getHostname();
            var servedFromHMRServer = hostname === "localhost" ? new RegExp("^(https?:\\/\\/(0.0.0.0|127.0.0.1)|localhost):" + getPort()).test(href) : href.indexOf(hostname + ":" + getPort());
            var absolute = /^https?:\/\//i.test(href) && href.indexOf(location.origin) !== 0 && !servedFromHMRServer;
            if (!absolute) updateLink(links[i]);
        }
        cssTimeout = null;
    }, 50);
}
function hmrDownload(asset) {
    if (asset.type === "js") {
        if (typeof document !== "undefined") {
            let script = document.createElement("script");
            script.src = asset.url + "?t=" + Date.now();
            if (asset.outputFormat === "esmodule") script.type = "module";
            return new Promise((resolve, reject)=>{
                var _document$head;
                script.onload = ()=>resolve(script);
                script.onerror = reject;
                (_document$head = document.head) === null || _document$head === void 0 || _document$head.appendChild(script);
            });
        } else if (typeof importScripts === "function") {
            // Worker scripts
            if (asset.outputFormat === "esmodule") return import(asset.url + "?t=" + Date.now());
            else return new Promise((resolve, reject)=>{
                try {
                    importScripts(asset.url + "?t=" + Date.now());
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        }
    }
}
async function hmrApplyUpdates(assets) {
    global.parcelHotUpdate = Object.create(null);
    let scriptsToRemove;
    try {
        // If sourceURL comments aren't supported in eval, we need to load
        // the update from the dev server over HTTP so that stack traces
        // are correct in errors/logs. This is much slower than eval, so
        // we only do it if needed (currently just Safari).
        // https://bugs.webkit.org/show_bug.cgi?id=137297
        // This path is also taken if a CSP disallows eval.
        if (!supportsSourceURL) {
            let promises = assets.map((asset)=>{
                var _hmrDownload;
                return (_hmrDownload = hmrDownload(asset)) === null || _hmrDownload === void 0 ? void 0 : _hmrDownload.catch((err)=>{
                    // Web extension fix
                    if (extCtx && extCtx.runtime && extCtx.runtime.getManifest().manifest_version == 3 && typeof ServiceWorkerGlobalScope != "undefined" && global instanceof ServiceWorkerGlobalScope) {
                        extCtx.runtime.reload();
                        return;
                    }
                    throw err;
                });
            });
            scriptsToRemove = await Promise.all(promises);
        }
        assets.forEach(function(asset) {
            hmrApply(module.bundle.root, asset);
        });
    } finally{
        delete global.parcelHotUpdate;
        if (scriptsToRemove) scriptsToRemove.forEach((script)=>{
            if (script) {
                var _document$head2;
                (_document$head2 = document.head) === null || _document$head2 === void 0 || _document$head2.removeChild(script);
            }
        });
    }
}
function hmrApply(bundle /*: ParcelRequire */ , asset /*:  HMRAsset */ ) {
    var modules = bundle.modules;
    if (!modules) return;
    if (asset.type === "css") reloadCSS();
    else if (asset.type === "js") {
        let deps = asset.depsByBundle[bundle.HMR_BUNDLE_ID];
        if (deps) {
            if (modules[asset.id]) {
                // Remove dependencies that are removed and will become orphaned.
                // This is necessary so that if the asset is added back again, the cache is gone, and we prevent a full page reload.
                let oldDeps = modules[asset.id][1];
                for(let dep in oldDeps)if (!deps[dep] || deps[dep] !== oldDeps[dep]) {
                    let id = oldDeps[dep];
                    let parents = getParents(module.bundle.root, id);
                    if (parents.length === 1) hmrDelete(module.bundle.root, id);
                }
            }
            if (supportsSourceURL) // Global eval. We would use `new Function` here but browser
            // support for source maps is better with eval.
            (0, eval)(asset.output);
            // $FlowFixMe
            let fn = global.parcelHotUpdate[asset.id];
            modules[asset.id] = [
                fn,
                deps
            ];
        } else if (bundle.parent) hmrApply(bundle.parent, asset);
    }
}
function hmrDelete(bundle, id) {
    let modules = bundle.modules;
    if (!modules) return;
    if (modules[id]) {
        // Collect dependencies that will become orphaned when this module is deleted.
        let deps = modules[id][1];
        let orphans = [];
        for(let dep in deps){
            let parents = getParents(module.bundle.root, deps[dep]);
            if (parents.length === 1) orphans.push(deps[dep]);
        }
        // Delete the module. This must be done before deleting dependencies in case of circular dependencies.
        delete modules[id];
        delete bundle.cache[id];
        // Now delete the orphans.
        orphans.forEach((id)=>{
            hmrDelete(module.bundle.root, id);
        });
    } else if (bundle.parent) hmrDelete(bundle.parent, id);
}
function hmrAcceptCheck(bundle /*: ParcelRequire */ , id /*: string */ , depsByBundle /*: ?{ [string]: { [string]: string } }*/ ) {
    if (hmrAcceptCheckOne(bundle, id, depsByBundle)) return true;
    // Traverse parents breadth first. All possible ancestries must accept the HMR update, or we'll reload.
    let parents = getParents(module.bundle.root, id);
    let accepted = false;
    while(parents.length > 0){
        let v = parents.shift();
        let a = hmrAcceptCheckOne(v[0], v[1], null);
        if (a) // If this parent accepts, stop traversing upward, but still consider siblings.
        accepted = true;
        else {
            // Otherwise, queue the parents in the next level upward.
            let p = getParents(module.bundle.root, v[1]);
            if (p.length === 0) {
                // If there are no parents, then we've reached an entry without accepting. Reload.
                accepted = false;
                break;
            }
            parents.push(...p);
        }
    }
    return accepted;
}
function hmrAcceptCheckOne(bundle /*: ParcelRequire */ , id /*: string */ , depsByBundle /*: ?{ [string]: { [string]: string } }*/ ) {
    var modules = bundle.modules;
    if (!modules) return;
    if (depsByBundle && !depsByBundle[bundle.HMR_BUNDLE_ID]) {
        // If we reached the root bundle without finding where the asset should go,
        // there's nothing to do. Mark as "accepted" so we don't reload the page.
        if (!bundle.parent) return true;
        return hmrAcceptCheck(bundle.parent, id, depsByBundle);
    }
    if (checkedAssets[id]) return true;
    checkedAssets[id] = true;
    var cached = bundle.cache[id];
    assetsToDispose.push([
        bundle,
        id
    ]);
    if (!cached || cached.hot && cached.hot._acceptCallbacks.length) {
        assetsToAccept.push([
            bundle,
            id
        ]);
        return true;
    }
}
function hmrDispose(bundle /*: ParcelRequire */ , id /*: string */ ) {
    var cached = bundle.cache[id];
    bundle.hotData[id] = {};
    if (cached && cached.hot) cached.hot.data = bundle.hotData[id];
    if (cached && cached.hot && cached.hot._disposeCallbacks.length) cached.hot._disposeCallbacks.forEach(function(cb) {
        cb(bundle.hotData[id]);
    });
    delete bundle.cache[id];
}
function hmrAccept(bundle /*: ParcelRequire */ , id /*: string */ ) {
    // Execute the module.
    bundle(id);
    // Run the accept callbacks in the new version of the module.
    var cached = bundle.cache[id];
    if (cached && cached.hot && cached.hot._acceptCallbacks.length) cached.hot._acceptCallbacks.forEach(function(cb) {
        var assetsToAlsoAccept = cb(function() {
            return getParents(module.bundle.root, id);
        });
        if (assetsToAlsoAccept && assetsToAccept.length) {
            assetsToAlsoAccept.forEach(function(a) {
                hmrDispose(a[0], a[1]);
            });
            // $FlowFixMe[method-unbinding]
            assetsToAccept.push.apply(assetsToAccept, assetsToAlsoAccept);
        }
    });
}

},{}],"f3OEd":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
var _loggerDefault = parcelHelpers.interopDefault(_logger);
var _snowplow = require("src/shared/snowplow");
var _extensions = require("src/shared/snowplow/extensions");
var _ensureBasketItemsOrderId = require("src/shared/snowplow/extensions/ensure-basket-items-order-id");
var _ensureBasketItemsOrderIdDefault = parcelHelpers.interopDefault(_ensureBasketItemsOrderId);
var _registerThirdPartyTags = require("src/shared/snowplow/extensions/register-third-party-tags");
var _registerThirdPartyTagsDefault = parcelHelpers.interopDefault(_registerThirdPartyTags);
const loadAdapters = async (context)=>{
    var _context_plugin;
    const plugins = (context === null || context === void 0 ? void 0 : (_context_plugin = context.plugin) === null || _context_plugin === void 0 ? void 0 : _context_plugin.split(",")) || [];
    const data = "default"; // Test CI, remove this later
    console.log("Adapter Context", context);
    const snowplow = await (0, _snowplow.createSnowplowTracker)(context);
    // Apply extensions to the tracker
    const tracker = (0, _extensions.applyExtensions)(snowplow, [
        (0, _extensions.withDeduplicationExtension),
        (0, _ensureBasketItemsOrderIdDefault.default),
        (0, _registerThirdPartyTagsDefault.default),
        (0, _extensions.withSnowplowSegmentsExtension),
        /** Dynamically add Google Ads plugin/extension */ plugins.includes("googleAds") && await require("cbfeedb7e6416808").then(({ withGoogleAdsExtension })=>withGoogleAdsExtension),
        /** Dynamically add Bing Ads plugin/extension */ plugins.includes("bingAds") && await require("cbfeedb7e6416808").then(({ withBingAdsExtension })=>withBingAdsExtension)
    ]);
    window.trackTrans = tracker.ecommerce.trackTransaction;
    window.trackSignUp = tracker.trackSignup;
    window.addToCart = tracker.ecommerce.trackAddToCart;
    window.removeFromCart = tracker.ecommerce.trackRemoveFromCart;
    switch(context.event){
        case "transaction":
            require("2dac2d880e1ed023").then(({ default: load })=>load(tracker));
            break;
        case "impression":
            require("e916a81d6d475005").then(({ default: load })=>load(tracker));
            break;
        case "signup":
            tracker.trackSignup(context);
            break;
        default:
            if (!context.environment) {
                (0, _loggerDefault.default).warn("No event/environment specified, Only pageview is active");
                return;
            }
            require("2dac2d880e1ed023").then(({ default: load })=>load(tracker));
            (0, _loggerDefault.default).warn(`No event specified, Loading ${context.environment}`);
    }
};
exports.default = loadAdapters;

},{"src/shared/logger":"by5yM","src/shared/snowplow":"28mZ3","src/shared/snowplow/extensions":"f32ct","src/shared/snowplow/extensions/ensure-basket-items-order-id":"7waq0","src/shared/snowplow/extensions/register-third-party-tags":"5n7oG","cbfeedb7e6416808":"6GR7Y","2dac2d880e1ed023":"cHoh5","e916a81d6d475005":"lIyaf","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"28mZ3":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "createSnowplowTracker", ()=>(0, _trackerDefault.default));
var _types = require("./types");
parcelHelpers.exportAll(_types, exports);
var _tracker = require("./tracker");
var _trackerDefault = parcelHelpers.interopDefault(_tracker);

},{"./types":"7IHYJ","./tracker":"fgxwV","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"7IHYJ":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "TransactionEvent", ()=>(0, _types.TransactionEvent));
parcelHelpers.export(exports, "CartEvent", ()=>(0, _types.CartEvent));
parcelHelpers.export(exports, "SignupParams", ()=>(0, _types.SignupParams));
var _types = require("src/shared/types");

},{"src/shared/types":"63cK8","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"63cK8":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);

},{"@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"fgxwV":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
var _loggerDefault = parcelHelpers.interopDefault(_logger);
const createSnowplowTracker = async (input)=>{
    const { appId, collector, event } = input;
    (0, _loggerDefault.default).info(`Creating Snowplow tracker for version ${input.version}`);
    const isLegacyTracker = input.version === "1";
    const createSnowplowV1Tracker = async ()=>{
        return await require("c474d95809fe9357").then(async ({ default: createSnowplowV1Tracker })=>await createSnowplowV1Tracker(input));
    };
    const createSnowplowV2Tracker = async ()=>{
        return await require("9207c2ce7a0ac3f2").then(async ({ default: createSnowplowV2Tracker })=>await createSnowplowV2Tracker(input));
    };
    const tracker = isLegacyTracker ? await createSnowplowV1Tracker() : await createSnowplowV2Tracker();
    tracker.initialize({
        appId,
        collector,
        event
    });
    tracker.record(input);
    return tracker;
};
exports.default = createSnowplowTracker;

},{"src/shared/logger":"by5yM","c474d95809fe9357":"eipFq","9207c2ce7a0ac3f2":"kUSZN","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"eipFq":[function(require,module,exports) {
module.exports = require("7d0cca16d04003ec")(require("49efd222443c2d7c").getBundleURL("3Lrhv") + "tracker.10511ce8.js" + "?" + Date.now()).catch((err)=>{
    delete module.bundle.cache[module.id];
    throw err;
}).then(()=>module.bundle.root("9Ke0X"));

},{"7d0cca16d04003ec":"kutjI","49efd222443c2d7c":"7CB78"}],"kUSZN":[function(require,module,exports) {
module.exports = require("e6b7f8bcf15984ea")(require("270b002cc9ccb977").getBundleURL("3Lrhv") + "tracker.fe0cc956.js" + "?" + Date.now()).catch((err)=>{
    delete module.bundle.cache[module.id];
    throw err;
}).then(()=>module.bundle.root("dwNxb"));

},{"e6b7f8bcf15984ea":"kutjI","270b002cc9ccb977":"7CB78"}],"f32ct":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "withSnowplowSegmentsExtension", ()=>(0, _segmentsDefault.default));
parcelHelpers.export(exports, "withGoogleAdsExtension", ()=>(0, _googleAdsDefault.default));
parcelHelpers.export(exports, "withBingAdsExtension", ()=>(0, _bingAdsDefault.default));
parcelHelpers.export(exports, "withDeduplicationExtension", ()=>(0, _deduplicatorDefault.default));
parcelHelpers.export(exports, "applyExtensions", ()=>applyExtensions);
var _segments = require("./segments");
var _segmentsDefault = parcelHelpers.interopDefault(_segments);
var _googleAds = require("./google-ads");
var _googleAdsDefault = parcelHelpers.interopDefault(_googleAds);
var _bingAds = require("./bing-ads");
var _bingAdsDefault = parcelHelpers.interopDefault(_bingAds);
var _deduplicator = require("./deduplicator");
var _deduplicatorDefault = parcelHelpers.interopDefault(_deduplicator);
const applyExtensions = (tracker, // Either load a function or undefined for dynamic loading
extensions)=>{
    return extensions.reduce((currentTracker, extension)=>extension ? extension(currentTracker) : currentTracker, tracker);
};

},{"./segments":"iLVtd","./google-ads":"gz0WP","./bing-ads":"11Ugr","./deduplicator":"TBwX4","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"iLVtd":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _segmentBuilder = require("src/shared/segment-builder");
const setupExtension = (context)=>{
    const liquidm = context.segmentId || context.s1;
    //* If s2.pv or s2.tr is not present, use context.s2 as default
    //* mainly used for legacy purposes
    const nexxen = {
        pageVisitorBeaconId: context["s2.pv"] || context["s2"],
        transactionBeaconId: context["s2.tr"] || context["s2"]
    };
    const dstillery = {
        siteVisitorNC: context["s3.pv"] || context["s3"],
        purchaseNC: context["s3.tr"] || context["s3"]
    };
    const segments = (0, _segmentBuilder.createSegments)({
        //* Accept both segmentId and s1 for legacy purposes
        liquidm,
        nexxen,
        dstillery
    });
    //* Expose cnnaSegments to the window object for custom integrations to use
    window.cnnaSegments = segments;
    liquidm && segments.liquidm.emit();
    nexxen && segments.nexxen.emit();
    dstillery && segments.dstillery.emit();
    return segments;
};
/**
 * This extension will send transaction events to our partner segments when a transaction is tracked
 */ const withSnowplowSegmentsExtension = (snowplow)=>{
    const segments = setupExtension(snowplow.context);
    // Original trackTransaction method
    const trackTransaction = snowplow.ecommerce.trackTransaction;
    //* Override the trackTransaction method
    snowplow.ecommerce.trackTransaction = (input)=>{
        trackTransaction(input);
        segments.nexxen.emitPurchase({
            bprice: input.total,
            cid: input.id
        });
        segments.dstillery.emitPurchase({
            amount: input.total,
            orderId: input.id
        });
    };
    return snowplow;
};
exports.default = withSnowplowSegmentsExtension;

},{"src/shared/segment-builder":"eIeIE","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"eIeIE":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "createSegments", ()=>(0, _builderDefault.default));
var _builder = require("./builder");
var _builderDefault = parcelHelpers.interopDefault(_builder);
var _types = require("./types");
parcelHelpers.exportAll(_types, exports);

},{"./builder":"8H2E0","./types":"9TRFS","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"8H2E0":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _liquidm = require("src/shared/segment-builder/segments/liquidm");
var _liquidmDefault = parcelHelpers.interopDefault(_liquidm);
var _nexxen = require("src/shared/segment-builder/segments/nexxen");
var _nexxenDefault = parcelHelpers.interopDefault(_nexxen);
var _dstillery = require("src/shared/segment-builder/segments/dstillery");
var _dstilleryDefault = parcelHelpers.interopDefault(_dstillery);
const createSegments = (input)=>{
    const { liquidm, nexxen, dstillery } = input;
    return {
        nexxen: (0, _nexxenDefault.default)(nexxen),
        liquidm: (0, _liquidmDefault.default)(liquidm),
        dstillery: (0, _dstilleryDefault.default)(dstillery)
    };
};
exports.default = createSegments;

},{"src/shared/segment-builder/segments/liquidm":"gGqtc","src/shared/segment-builder/segments/nexxen":"8qzEd","src/shared/segment-builder/segments/dstillery":"j7Q7s","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"gGqtc":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
var _loggerDefault = parcelHelpers.interopDefault(_logger);
const liquidmSegmentBuilder = (segmentId)=>{
    return {
        emit: ()=>{
            (0, _loggerDefault.default).info("Building s1 segment with segmentId: ", segmentId);
            (function(c, d) {
                var a = document.createElement("script");
                a.type = "text/javascript";
                a.async = !0;
                a.src = `https://tracking.lqm.io/odin/handle_sync.js?seg=${segmentId}&gdpr=` + ("1" === c ? "1" : "0") + "&gdpr_consent=" + (d ? encodeURIComponent(d) : "") + "&cb=" + new Date().getTime();
                var b = document.getElementsByTagName("script")[0];
                b.parentNode.insertBefore(a, b);
            })();
        }
    };
};
exports.default = liquidmSegmentBuilder;

},{"src/shared/logger":"by5yM","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"8qzEd":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
var _loggerDefault = parcelHelpers.interopDefault(_logger);
var _createImagePixel = require("src/shared/utils/create-image-pixel");
var _createImagePixelDefault = parcelHelpers.interopDefault(_createImagePixel);
const nexxenSegmentBuilder = (beacons)=>{
    const { pageVisitorBeaconId, transactionBeaconId } = beacons;
    return {
        emit: ()=>{
            if (!pageVisitorBeaconId) return;
            (0, _loggerDefault.default).info("Building s2 segment with segmentId: ", pageVisitorBeaconId);
            const pix = (0, _createImagePixelDefault.default)(`https://r.turn.com/r/beacon?b2=${pageVisitorBeaconId}`);
            document.head.appendChild(pix);
        },
        emitPurchase: (input)=>{
            const { cid, bprice } = input;
            if (!cid || !bprice || !transactionBeaconId) {
                console.warn("Missing required data for s2.tr");
                return;
            }
            (0, _loggerDefault.default).info("Emitting purchase event for segmentId: ", transactionBeaconId);
            const pix = (0, _createImagePixelDefault.default)(`https://r.turn.com/r/beacon?b2=${transactionBeaconId}&cid=${cid}&bprice=${bprice}`);
            document.head.appendChild(pix);
        }
    };
};
exports.default = nexxenSegmentBuilder;

},{"src/shared/logger":"by5yM","src/shared/utils/create-image-pixel":"lyis2","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"lyis2":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
const createImagePixel = (url)=>{
    const pixel = document.createElement("img");
    pixel.src = url;
    // Ensure it's 1x1 pixel in size
    pixel.width = 1;
    pixel.height = 1;
    // Make it invisible
    pixel.style.position = "absolute";
    pixel.style.left = "-9999px";
    return pixel;
};
exports.default = createImagePixel;

},{"@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"j7Q7s":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
var _loggerDefault = parcelHelpers.interopDefault(_logger);
var _createImagePixel = require("src/shared/utils/create-image-pixel");
var _createImagePixelDefault = parcelHelpers.interopDefault(_createImagePixel);
const DstillerySegmentBuilderInput = (input)=>{
    const { siteVisitorNC, purchaseNC } = input;
    return {
        emit: ()=>{
            if (!siteVisitorNC) return;
            (0, _loggerDefault.default).info("Building s3 segment with segmentId: ", siteVisitorNC);
            const pix = (0, _createImagePixelDefault.default)(`https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=${siteVisitorNC}&ncv=76`);
            document.head.appendChild(pix);
        },
        emitPurchase: (input)=>{
            const { orderId, amount } = input;
            if (!orderId || !amount || !purchaseNC) {
                console.warn("Missing required data for s3.tr");
                return;
            }
            (0, _loggerDefault.default).info("Emitting dstillery purchase event for segmentId: ", purchaseNC);
            const pix = (0, _createImagePixelDefault.default)(`https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=${purchaseNC}&ncv=76&dstOrderId=${orderId}&dstOrderAmount=${amount}`);
            document.head.appendChild(pix);
        }
    };
};
exports.default = DstillerySegmentBuilderInput;

},{"src/shared/logger":"by5yM","src/shared/utils/create-image-pixel":"lyis2","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"9TRFS":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);

},{"@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"gz0WP":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
var _loggerDefault = parcelHelpers.interopDefault(_logger);
const setupExtension = (context)=>{
    // Fail fast if the required params are not present
    if (!context.conversionId || !context.conversionLabel) console.warn("Conversion ID and Conversion Label are required for Google Ads");
    if (!context.conversionId.includes("AW-")) context.conversionId = `AW-${context.conversionId}`;
    (0, _loggerDefault.default).info(`\u{1F680}\u{1F680}\u{1F680} Google Ads Plugin loaded for ${context.environment}`);
    document.createElement("script").src = `https://www.googletagmanager.com/gtag/js?id=${context.conversionId}`;
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    /**Note: the @ts-ignore lines below are necessary to supress typescript warnings for the arguments object above */ // @ts-ignore
    gtag("js", new Date());
    // @ts-ignore
    gtag("config", context.conversionId);
    // Cross domain tracking
    if (context.crossDomainSites) {
        const crossDomainSites = context.crossDomainSites.split(",");
        const sites = crossDomainSites.map((site)=>site.trim());
        // @ts-ignore
        gtag("set", "linker", {
            domains: sites
        });
    }
};
/**
 * This extension will send Google ads conversion events when a transaction is tracked
 */ const withSnowplowGoogleAdsExtension = (snowplow)=>{
    let { conversionId, conversionLabel } = snowplow.context;
    if (!conversionId.includes("AW-")) conversionId = `AW-${conversionId}`;
    setupExtension(snowplow.context);
    // Original trackTransaction method
    const trackTransaction = snowplow.ecommerce.trackTransaction;
    //* Override the trackTransaction method
    snowplow.ecommerce.trackTransaction = (input)=>{
        trackTransaction(input);
        (0, _loggerDefault.default).info(`\u{1F680}\u{1F680}\u{1F680} Google Ads Extension Transaction Event`, {
            send_to: `${conversionId}/${conversionLabel}`,
            value: input.total,
            currency: input.currency,
            transaction_id: input.id
        });
        window.gtag("event", "conversion", {
            send_to: `${conversionId}/${conversionLabel}`,
            value: input.total,
            currency: input.currency,
            transaction_id: input.id
        });
    };
    return snowplow;
};
exports.default = withSnowplowGoogleAdsExtension;

},{"src/shared/logger":"by5yM","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"11Ugr":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
var _loggerDefault = parcelHelpers.interopDefault(_logger);
const setupExtension = (context)=>{
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.innerHTML = `(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:${context.tagId}};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`;
    document.head.appendChild(script);
    window.uetq = window.uetq || [];
};
/**
 * This extension will send Bing Ads conversion events when a transaction is tracked
 */ const withSnowplowBingAdsExtension = (snowplow)=>{
    setupExtension(snowplow.context);
    // Original trackTransaction method
    const trackTransaction = snowplow.ecommerce.trackTransaction;
    //* Override the trackTransaction method
    snowplow.ecommerce.trackTransaction = (input)=>{
        trackTransaction(input);
        (0, _loggerDefault.default).info(`\u{1F680}\u{1F680}\u{1F680} Bing Ads Extension Transaction Event`, {
            transaction_id: input.id,
            ecomm_prodid: input.items.map((item)=>item.sku),
            ecomm_pagetype: "purchase",
            ecomm_totalvalue: input.total,
            revenue_value: input.total,
            currency: "USD",
            items: input.items.map((item)=>({
                    id: item.sku,
                    quantity: item.quantity,
                    price: item.unitPrice
                }))
        });
        window.uetq.push("event", "purchase", {
            transaction_id: input.id,
            ecomm_prodid: input.items.map((item)=>item.sku),
            ecomm_pagetype: "purchase",
            ecomm_totalvalue: input.total,
            revenue_value: input.total,
            currency: "USD",
            items: input.items.map((item)=>({
                    id: item.sku,
                    quantity: item.quantity,
                    price: item.unitPrice
                }))
        });
    };
    return snowplow;
};
exports.default = withSnowplowBingAdsExtension;

},{"src/shared/logger":"by5yM","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"TBwX4":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
var _logger = require("src/shared/logger");
// add a check to check if the jsonString is an array
function tryParseJSONObject(jsonString) {
    try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") return {
            type: "object",
            value: o
        };
        if (Array.isArray(o)) return {
            type: "array",
            value: o
        };
        return {
            type: "string",
            value: jsonString
        };
    } catch (e) {
        return {
            type: "string",
            value: jsonString
        };
    }
}
const withDeduplicationExtension = (snowplow)=>{
    const logger = (0, _logger.createLogger)("MJ:Deduplication");
    const { trackTransaction: originalTrackTransaction, trackAddToCart: originalTrackAddToCart, trackRemoveFromCart: originalTrackRemoveFromCart } = snowplow.ecommerce;
    const { trackSignup: originalTrackSignup } = snowplow;
    const getStorageKey = (eventType)=>`${snowplow.context.appId}_${eventType}`;
    const deduplicateEvent = (originalMethod, eventType, input, idField)=>{
        const storageKey = getStorageKey(eventType);
        const eventId = idField.map((key)=>input[key]).join(":");
        let value = localStorage.getItem(storageKey);
        let existingIds = [];
        if (value) {
            const parsed = tryParseJSONObject(value);
            if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === "object") existingIds = parsed.value;
            else if ((parsed === null || parsed === void 0 ? void 0 : parsed.type) === "string") existingIds = [
                parsed.value
            ];
        }
        console.log("existingIds", existingIds);
        if (existingIds.includes(eventId)) {
            logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate.`);
            return;
        }
        originalMethod(input);
        localStorage.setItem(storageKey, JSON.stringify([
            ...existingIds,
            eventId
        ]));
    };
    snowplow.ecommerce.trackTransaction = (input)=>deduplicateEvent(originalTrackTransaction, "transaction", input, [
            "id"
        ]);
    snowplow.ecommerce.trackAddToCart = (input)=>deduplicateEvent(originalTrackAddToCart, "addToCart", input, [
            "name",
            "quantity"
        ]);
    snowplow.ecommerce.trackRemoveFromCart = (input)=>deduplicateEvent(originalTrackRemoveFromCart, "removeFromCart", input, [
            "name",
            "quantity"
        ]);
    snowplow.trackSignup = (input)=>deduplicateEvent(originalTrackSignup, "signUp", input, [
            "uuid",
            "emailAddress"
        ]);
    return snowplow;
};
exports.default = withDeduplicationExtension;

},{"src/shared/logger":"by5yM","@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"7waq0":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
/**
 *
 * This extension ensures that the orderId for the basket items is the same as the orderId for the transaction.
 * This is important for Shopify integrations since the orderId for the basket items is the product id and not the order id.
 */ const withEnsureBasketItemsOrderId = (snowplow)=>{
    const trackTransaction = snowplow.ecommerce.trackTransaction;
    snowplow.ecommerce.trackTransaction = (input)=>{
        trackTransaction({
            id: input.id,
            affiliateId: input.affiliateId,
            total: input.total,
            tax: input.tax,
            shipping: input.shipping,
            city: input.city,
            state: input.state,
            country: input.country,
            currency: input.currency,
            discount: input.discount,
            couponCode: input.couponCode,
            alternativeTransactionIds: input.alternativeTransactionIds,
            items: input.items.map((item)=>({
                    orderId: input.id,
                    sku: item.sku,
                    name: item.name,
                    category: item.category,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    currency: item.currency
                }))
        });
    };
    return snowplow;
};
exports.default = withEnsureBasketItemsOrderId;

},{"@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"5n7oG":[function(require,module,exports) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
let thirdPartyTags = {};
const registerThirdPartyTags = (input)=>{
    thirdPartyTags = input;
};
window.registerThirdPartyTags = registerThirdPartyTags;
const replaceMacros = (tag, placeholders)=>tag.replace(/{\w+}/g, (match)=>placeholders[match] || match);
const createElementForTag = (type, tagWithMacros)=>{
    if (type === "script") {
        const script = document.createElement("script");
        script.src = tagWithMacros;
        script.async = true;
        document.body.appendChild(script);
    } else if (type === "image") {
        const img = new Image();
        img.src = tagWithMacros;
        document.body.appendChild(img);
    }
};
const processTags = (tags, placeholders)=>{
    tags === null || tags === void 0 ? void 0 : tags.forEach(({ tag, type })=>{
        const tagWithMacros = replaceMacros(tag, placeholders);
        createElementForTag(type, tagWithMacros);
    });
};
const withRegisterThirdPartyTagsExtension = (snowplow)=>{
    const { trackTransaction, trackAddToCart, trackRemoveFromCart } = snowplow.ecommerce;
    const { trackSignup } = snowplow;
    snowplow.ecommerce.trackTransaction = (input)=>{
        var _input_id, _input_total, _input_tax, _input_shipping, _input_userId;
        trackTransaction(input);
        processTags(thirdPartyTags.onTransaction, {
            "{transaction_id}": (input === null || input === void 0 ? void 0 : (_input_id = input.id) === null || _input_id === void 0 ? void 0 : _input_id.toString()) || "null",
            "{transaction_total}": (input === null || input === void 0 ? void 0 : (_input_total = input.total) === null || _input_total === void 0 ? void 0 : _input_total.toString()) || "0",
            "{transaction_tax}": (input === null || input === void 0 ? void 0 : (_input_tax = input.tax) === null || _input_tax === void 0 ? void 0 : _input_tax.toString()) || "0",
            "{transaction_shipping}": (input === null || input === void 0 ? void 0 : (_input_shipping = input.shipping) === null || _input_shipping === void 0 ? void 0 : _input_shipping.toString()) || "0",
            "{transaction_city}": (input === null || input === void 0 ? void 0 : input.city) || "null",
            "{transaction_state}": (input === null || input === void 0 ? void 0 : input.state) || "null",
            "{transaction_country}": (input === null || input === void 0 ? void 0 : input.country) || "null",
            "{transaction_currency}": (input === null || input === void 0 ? void 0 : input.currency) || "null",
            "{transaction_userId}": (input === null || input === void 0 ? void 0 : (_input_userId = input.userId) === null || _input_userId === void 0 ? void 0 : _input_userId.toString()) || "null"
        });
    };
    snowplow.ecommerce.trackAddToCart = (input)=>{
        var _input_unitPrice, _input_quantity, _input_userId;
        trackAddToCart(input);
        processTags(thirdPartyTags.onAddToCart, {
            "{cart_id}": (input === null || input === void 0 ? void 0 : input.sku) || "null",
            "{cart_name}": (input === null || input === void 0 ? void 0 : input.name) || "null",
            "{cart_category}": (input === null || input === void 0 ? void 0 : input.category) || "null",
            "{cart_unitPrice}": (input === null || input === void 0 ? void 0 : (_input_unitPrice = input.unitPrice) === null || _input_unitPrice === void 0 ? void 0 : _input_unitPrice.toString()) || "0",
            "{cart_quantity}": (input === null || input === void 0 ? void 0 : (_input_quantity = input.quantity) === null || _input_quantity === void 0 ? void 0 : _input_quantity.toString()) || "0",
            "{cart_currency}": (input === null || input === void 0 ? void 0 : input.currency) || "null",
            "{cart_userId}": (input === null || input === void 0 ? void 0 : (_input_userId = input.userId) === null || _input_userId === void 0 ? void 0 : _input_userId.toString()) || "null"
        });
    };
    snowplow.ecommerce.trackRemoveFromCart = (input)=>{
        var _input_unitPrice, _input_quantity, _input_userId;
        trackRemoveFromCart(input);
        processTags(thirdPartyTags.onRemoveFromCart, {
            "{cart_id}": (input === null || input === void 0 ? void 0 : input.sku) || "null",
            "{cart_name}": (input === null || input === void 0 ? void 0 : input.name) || "null",
            "{cart_category}": (input === null || input === void 0 ? void 0 : input.category) || "null",
            "{cart_unitPrice}": (input === null || input === void 0 ? void 0 : (_input_unitPrice = input.unitPrice) === null || _input_unitPrice === void 0 ? void 0 : _input_unitPrice.toString()) || "0",
            "{cart_quantity}": (input === null || input === void 0 ? void 0 : (_input_quantity = input.quantity) === null || _input_quantity === void 0 ? void 0 : _input_quantity.toString()) || "0",
            "{cart_currency}": (input === null || input === void 0 ? void 0 : input.currency) || "null",
            "{cart_userId}": (input === null || input === void 0 ? void 0 : (_input_userId = input.userId) === null || _input_userId === void 0 ? void 0 : _input_userId.toString()) || "null"
        });
    };
    snowplow.trackSignup = (input)=>{
        trackSignup(input);
        processTags(thirdPartyTags.onSignup, {
            "{signup_firstName}": (input === null || input === void 0 ? void 0 : input.firstName) || "null",
            "{signup_lastName}": (input === null || input === void 0 ? void 0 : input.lastName) || "null",
            "{signup_uuid}": (input === null || input === void 0 ? void 0 : input.uuid) || "null",
            "{signup_email}": (input === null || input === void 0 ? void 0 : input.emailAddress) || "null",
            "{signup_address}": (input === null || input === void 0 ? void 0 : input.address) || "null",
            "{signup_city}": (input === null || input === void 0 ? void 0 : input.city) || "null",
            "{signup_state}": (input === null || input === void 0 ? void 0 : input.state) || "null",
            "{signup_phone}": (input === null || input === void 0 ? void 0 : input.phoneNumber) || "null",
            "{signup_advertiser}": (input === null || input === void 0 ? void 0 : input.advertiser) || "null"
        });
    };
    return snowplow;
};
exports.default = withRegisterThirdPartyTagsExtension;

},{"@parcel/transformer-js/src/esmodule-helpers.js":"6ZdKi"}],"6GR7Y":[function(require,module,exports) {
module.exports = Promise.resolve(module.bundle.root("f32ct"));

},{}],"cHoh5":[function(require,module,exports) {
module.exports = require("132ca15003d3ea57")(require("9a8b3a9a2f5dba8e").getBundleURL("3Lrhv") + "ecommerce.72edccda.js" + "?" + Date.now()).catch((err)=>{
    delete module.bundle.cache[module.id];
    throw err;
}).then(()=>module.bundle.root("hCU9L"));

},{"132ca15003d3ea57":"kutjI","9a8b3a9a2f5dba8e":"7CB78"}],"lIyaf":[function(require,module,exports) {
module.exports = require("364d7efbda1f218a")(require("4b748c7425284fd7").getBundleURL("3Lrhv") + "impressions.a66b9bd5.js" + "?" + Date.now()).catch((err)=>{
    delete module.bundle.cache[module.id];
    throw err;
}).then(()=>module.bundle.root("ezTac"));

},{"364d7efbda1f218a":"kutjI","4b748c7425284fd7":"7CB78"}]},["ed2Dz"], null, "parcelRequire07df")

//# sourceMappingURL=adapters.f9a446b3.js.map
