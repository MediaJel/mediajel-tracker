import pageview from "./types/pageview";
import dynamicImport from "./utils/dynamicImport";

export default function handleTag({ appId, environment, collector, retailId }) {
  pageview(appId, collector, retailId);
  if (environment) {
    dynamicImport(appId, environment, retailId);
  }
}
