import { BingAdsPluginParams } from "../../shared/types";

const createBingScript = (context: BingAdsPluginParams) => {
  const script = document.createElement("script");
  script.innerHTML = `!function(e,a,t,n,o){var r,c,s;e[o]=e[o]||[],r=function(){var a={ti:${context.tagId}};a.q=e[o],e[o]=new UET(a),e[o].push("pageLoad")},(c=a.createElement(t)).src=n,c.async=1,c.onload=c.onreadystatechange=function(){var e=this.readyState;e&&"loaded"!==e&&"complete"!==e||(r(),c.onload=c.onreadystatechange=null)},(s=a.getElementsByTagName(t)[0]).parentNode.insertBefore(c,s)}(window,document,"script","//bat.bing.com/bat.js","uetq"); `;
  document.appendChild(script);
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
    default: {
      console.warn("Bing Ads does not support this environment");
    }
  }
};

export default createBingAdsPlugin;
