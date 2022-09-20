import { QueryStringContext } from "../../shared/types";

const createGoogleAds =  (context: QueryStringContext) => {
  document.createElement("script").src = "https://www.googletagmanager.com/gtag/js?id=AW-10963714894";

  window.dataLayer = window.dataLayer || [];

  const gtag = (...args) => window.dataLayer.push(args);

  gtag("js", new Date());
  gtag("config", "AW-10963714894");

  console.log(window.dataLayer);
};

export default createGoogleAds;
