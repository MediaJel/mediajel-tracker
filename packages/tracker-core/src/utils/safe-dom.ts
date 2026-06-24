/**
 * Safe DOM helpers for tag code that runs on arbitrary client pages.
 * They never throw when an element is missing.
 */

/**
 * Returns the trimmed `textContent` of the first element matching `selector`,
 * or `fallback` (default "") when the element or its text is absent.
 * Optional `root` scopes the query (e.g. a previously found container element).
 */
export const queryText = (selector: string, fallback = "", root: ParentNode = document): string => {
  return root.querySelector(selector)?.textContent?.trim() ?? fallback;
};

/**
 * Returns the first element matching `selector`, or null. Use when you need the
 * element itself (e.g. to scope a nested query) rather than just its text.
 */
export const queryEl = <T extends Element = Element>(selector: string, root: ParentNode = document): T | null => {
  return root.querySelector<T>(selector);
};
