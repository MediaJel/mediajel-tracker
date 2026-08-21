/**
 * Parcel's `data-url:` pipeline: the referenced file is base64-encoded and inlined as a
 * `data:` URI at build time, so the mark travels inside the lazy chunk and the widget never
 * makes a network request for its own artwork on a client's page.
 */
declare module "data-url:*" {
  const dataUrl: string;
  export default dataUrl;
}
