/**
 * Cookie text helpers. Pure: callers pass `document.cookie` in and assign the built string to it.
 */

export interface CookieOptions {
  /** Shared domain from root-domain discovery, or null for a host-only cookie. */
  domain: string | null;
  maxAge: number;
  /** The page is served over https. */
  secure: boolean;
  /** The page runs inside a cross-site frame, where only a partitioned SameSite=None cookie can be kept. */
  framed: boolean;
}

export const readCookie = (cookieText: string, name: string): string | null => {
  const prefix = `${name}=`;
  const parts = cookieText ? cookieText.split(/;\s*/) : [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].indexOf(prefix) === 0) return parts[i].slice(prefix.length);
  }
  return null;
};

export const buildCookie = (name: string, value: string, options: CookieOptions): string => {
  const attributes = [`${name}=${value}`, `Max-Age=${Math.max(0, Math.floor(options.maxAge))}`, "Path=/"];
  if (options.domain) attributes.push(`Domain=${options.domain}`);
  if (options.framed && options.secure) {
    attributes.push("SameSite=None", "Secure", "Partitioned");
  } else {
    attributes.push("SameSite=Lax");
    if (options.secure) attributes.push("Secure");
  }
  return attributes.join("; ");
};
