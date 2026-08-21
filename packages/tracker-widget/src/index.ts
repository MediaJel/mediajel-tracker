/**
 * Package entry — types only.
 *
 * Nothing here may pull in the runtime: importing `@mediajel/tracker-widget` must never
 * drag the AI SDK into a consumer's bundle. The runtime lives behind the `./widget`
 * subpath, which the tag reaches solely through a dynamic `import()`.
 */
export * from "@mediajel/tracker-widget/api";
