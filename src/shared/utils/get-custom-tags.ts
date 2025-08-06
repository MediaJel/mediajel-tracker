import logger from "src/shared/logger";

export const getCustomTags = async () => {
  const hname = window.location.hostname;
  const url = `${process.env.FRICTIONLESS_CUSTOMTAG_URL}/domains/${Buffer.from(hname, "utf-8").toString("base64")}.js`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return;
    }

    const scriptText = await response.text();
    const script = document.createElement("script");
    script.type = "text/javascript";

    if (scriptText.trim().startsWith("<") || scriptText.includes("<!DOCTYPE")) {
      return;
    }

    script.text = scriptText;
    document.head.appendChild(script);
    logger.info(`Successfully imported external script from ${url}`);
  } catch (error) {
    logger.warn(`Failed to import script from ${url}: ${error}`);
    return;
  }
};
