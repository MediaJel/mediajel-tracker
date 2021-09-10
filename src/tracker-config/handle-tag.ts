import {
  ContextInterface,
  TagContext,
  PageviewContext,
} from "../interface";
import pageview from "./trackerTypes/pageview";
import { loadClientConfig, loadEnvironmentConfig } from "./utils";

export default function handleTag(context: ContextInterface): void {
  const { environment, retailId, appId, collector, client } = context;

  const tagContext: TagContext = { appId, environment, retailId, client };
  const pageviewContext: PageviewContext = { appId, collector, retailId };

  const isPageview: Boolean = pageview(pageviewContext);

  if (isPageview && environment) {
    loadEnvironmentConfig(tagContext);
  }
  if (isPageview && client) {
    loadClientConfig(tagContext)
  }
}
