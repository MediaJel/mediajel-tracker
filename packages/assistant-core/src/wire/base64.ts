/**
 * Text from base64 in either alphabet — the standard `+`/`/` one the tag names its custom-tag
 * files with, or the URL-safe `-`/`_` one the tracker encodes its payloads with — padding
 * optional, malformed UTF-8 repaired; null for anything that is not base64 at all.
 */
export const base64ToText = (value: string): string | null => {
  const standard = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "=");
  try {
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
};
