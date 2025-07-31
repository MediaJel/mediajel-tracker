import logger from "src/shared/logger";
import getContext from "./get-context";
import { QueryStringContext } from "../types";

export const getAppIdTags = async () => {
  const context: QueryStringContext = getContext();

  const id = `${process.env.FRICTIONLESS_CUSTOMTAG_APPID}/app-ids/${Buffer.from(context.appId, "utf-8").toString("base64")}.js`;

  try {
    const response = await fetch(id);

    if (!response.ok) {
      return;
    }

    const contentType = response.headers.get("content-type");
    if (
      !contentType ||
      (!contentType.includes("javascript") && !contentType.includes("text/plain") && !contentType.includes("text/html"))
    ) {
      logger.debug(`[APPID] Invalid content type received from ${id}: ${contentType}`);
      return;
    }

    const scriptText = await response.text();

    // Check if the response contains HTML instead of JavaScript
    if (scriptText.trim().startsWith("<")) {
      return;
    }

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
