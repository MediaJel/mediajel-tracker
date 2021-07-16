import pageview from "./types/pageview"
import dynamicImport from "./utils/dynamicImport";

export default function handleTag({ appId, environment, collector }) {
  pageview(appId, collector);
  if (environment) {
    dynamicImport(environment);
  }
}
