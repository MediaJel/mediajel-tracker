import {
  ContextInterface,
  DynamicContext,
  PageviewContext,
} from "../interface";
import pageview from "./trackerTypes/pageview";
import { dynamicImport } from "./utils";

export default function handleTag(context: ContextInterface): void {
  const { environment, retailId, appId, collector } = context;
  const dynamicContext: DynamicContext = { appId, environment, retailId };
  const pageviewContext: PageviewContext = { appId, collector, retailId };

  const isPageview: Boolean = pageview(pageviewContext);

  if (isPageview && environment) {
    dynamicImport(dynamicContext);
  }
}
