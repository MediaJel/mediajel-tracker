import logger from "src/shared/logger";
import getContext from "./get-context";
import { QueryStringContext } from "../types";

export const getAppIdTags = async () => {
  const context: QueryStringContext = getContext();
  const id = `${process.env.FRICTIONLESS_CUSTOMTAG_URL}/app-ids/${context.appId}.js`;

  try {
    const response = await fetch(id);

    const scriptText = await response.text();
    const script = document.createElement("script");
    script.type = "text/javascript";

    script.text = scriptText;
    document.head.appendChild(script);
    logger.info(`Successfully imported external script from ${id}`);
  } catch (error) {
    logger.warn(`Failed to import script from ${id}: ${error}`);
    return;
  }
};
