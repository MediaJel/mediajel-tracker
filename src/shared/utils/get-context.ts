import { QueryStringContext, QueryStringParams } from "../types";

// Locates our tag
const getContext = () => {
  const scriptContents: QueryStringContext[] = []; 
  const scriptSrc: string[] = [];
  const scriptElements = document.querySelectorAll("script");

  scriptElements.forEach((scriptElement) => {
    const srcAttributeValue = scriptElement.getAttribute("src");

    if (srcAttributeValue && srcAttributeValue.includes("appId=")) {
      const substring: string = srcAttributeValue.split('?')[1];

      if(!scriptSrc.includes(substring)){ // check if appId is already implemented and exist then clean dups
        scriptSrc.push(substring); // If appId doesn't exist on Array checker for dups then add new param string

        const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
        const { mediajelAppId, appId, version, ...params } = Object.fromEntries(
          urlSearchParams.entries()
        ) as unknown as QueryStringParams;
  
        const context = {
          appId: appId || mediajelAppId,
          version: version || "1",
          collector: params.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
          ...params,
        } as  QueryStringContext ;
        
        scriptContents.push(context);
      }
    
    }
  });

  return scriptContents;
};

export default getContext;
