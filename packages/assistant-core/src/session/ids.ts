/**
 * Ids for sessions, pages and timeline events.
 *
 * `crypto.randomUUID` only landed in 2021 browsers and is unavailable on insecure origins,
 * both of which a client site can be, so it is a fast path and never a requirement. These ids
 * are local correlation handles — nothing security-sensitive depends on their entropy.
 */
export const newId = (prefix: string): string => {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}_${uuid}`;
};
