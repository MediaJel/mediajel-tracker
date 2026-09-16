import { TagSearch } from "@mediajel/assistant-core/context";

/**
 * Where this build's tag is served from besides MediaJel's own hosts, so a staging build recognises
 * its own tag as MediaJel's — whether the page reads itself or the background reads it.
 */
export const TAG_SEARCH: TagSearch = {
  origins: [(process.env.PLASMO_PUBLIC_TAG_ORIGIN ?? "").trim()].filter(Boolean),
};
