/**
 * Plasmo's inlining schemes. `data-base64:` turns an asset into a data URI at build time, so
 * the MJ mark ships inside the bundle rather than as a file the page has to be allowed to
 * fetch — the same reasoning as the in-page widget's, for a different reason: here it keeps
 * the mark out of `web_accessible_resources`, where it would be readable by every site.
 */
declare module "data-base64:*" {
  const value: string;
  export default value;
}

declare module "data-text:*" {
  const value: string;
  export default value;
}
