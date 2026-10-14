/**
 * A job's identity.
 *
 * The hostname, and nothing else. It is what the deploy target is named after
 * (`src/domains/<hostname>.ts`, matched byte for byte by the tag), so using anything richer
 * here would mean two ideas of "which site is this" that could disagree.
 *
 * Anything that is not an http(s) page — the new-tab page, a PDF viewer, a chrome:// URL — has
 * no site and therefore no job. The panel says so rather than opening an empty work order.
 */
export const siteOf = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.hostname || null;
  } catch {
    return null;
  }
};
