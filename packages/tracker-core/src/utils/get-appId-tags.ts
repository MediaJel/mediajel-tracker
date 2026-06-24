import logger from "@mediajel/tracker-core/logger";

export const getAppIdTags = async (appId: string) => {
  // No custom-tag CDN configured (e.g. local/training builds) — skip rather than fetch from `undefined/...`.
  if (!process.env.FRICTIONLESS_CUSTOMTAG_URL) return;
  const id = `${process.env.FRICTIONLESS_CUSTOMTAG_URL}/app-ids/${Buffer.from(appId).toString("base64")}.js`;

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
