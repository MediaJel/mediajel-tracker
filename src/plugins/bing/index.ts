import { BingAdsPluginParams } from "../../shared/types";

const createBingScript = (context: BingAdsPluginParams) => {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.innerHTML = `(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:${context.tagId}};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`;
  document.head.appendChild(script);
};
const createBingAdsPlugin = (context: BingAdsPluginParams) => {
  console.log(`🚀🚀🚀 Bing Ads Plugin loaded for ${context.environment}`);
  console.log(`🚀🚀🚀 Bing Ads Plugin params: ${JSON.stringify(context, null, 2)}`);

  createBingScript(context);

  window.uetq = window.uetq || [];

  switch (context.environment) {
    case "dutchie-iframe": {
      import("./imports/carts/dutchie-iframe").then(({ default: load }) => load(context));
      break;
    }
    case "jane": {
      import("./imports/carts/jane").then(({ default: load }) => load(context));
      break;
    }
    case "tymber": {
      import("./imports/carts/tymber").then(({ default: load }) => load(context));
      break;
    }
    case "greenrush": {
      import("./imports/carts/greenrush").then(({ default: load }) => load(context));
      break;
    }
    case "buddi": {
      import("./imports/carts/buddi").then(({ default: load }) => load(context));
      break;
    }
    case "ecwid": {
      import("./imports/carts/ecwid").then(({ default: load }) => load(context));
      break;
    }
    case "grassdoor": {
      import("./imports/carts/grassdoor").then(({ default: load }) => load(context));
      break;
    }
    case "lightspeed": {
      import("./imports/carts/lightspeed").then(({ default: load }) => load(context));
      break;
    }
    case "meadow": {
      import("./imports/carts/meadow").then(({ default: load }) => load(context));
      break;
    }
    case "olla": {
      import("./imports/carts/olla").then(({ default: load }) => load(context));
      break;
    }
    case "shopify": {
      import("./imports/carts/shopify").then(({ default: load }) => load(context));
      break;
    }
    case "woocommerce": {
      import("./imports/carts/woocommerce").then(({ default: load }) => load(context));
      break;
    }
    case "wefunder": {
      import("./imports/carts/wefunder").then(({ default: load }) => load(context));
      break;
    }
    default: {
      console.warn("Bing Ads does not support this environment");
    }
  }
};

export default createBingAdsPlugin;
