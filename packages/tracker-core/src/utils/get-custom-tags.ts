import logger from '@mediajel/tracker-core/logger';

export const getCustomTags = async () => {
  // No custom-tag CDN configured (e.g. local/training builds) — skip rather than fetch from `undefined/...`.
  if (!process.env.FRICTIONLESS_CUSTOMTAG_URL) return;
  const hname = window.location.hostname;
  const url = `${process.env.FRICTIONLESS_CUSTOMTAG_URL}/domains/${Buffer.from(hname, "utf-8").toString("base64")}.js`;

  try {
    const response = await fetch(url);

    const scriptText = await response.text();
    const script = document.createElement("script");
    script.type = "text/javascript";

    script.text = scriptText;
    document.head.appendChild(script);
    logger.info(`Successfully imported external script from ${url}`);
  } catch (error) {
    logger.warn(`Failed to import script from ${url}: ${error}`);
    return;
  }
};
