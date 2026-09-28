import { siteOf } from "~/lib/site";

/** The site a tab is on, or the reason the assistant cannot work there. */
export const siteOfTab = async (tabId: number): Promise<string> => {
  const tab = await chrome.tabs.get(tabId);
  const site = siteOf(tab.url ?? "");
  if (!site) {
    throw new Error("This tab is not on a website the assistant can work with. Open the client's site first.");
  }
  return site;
};
