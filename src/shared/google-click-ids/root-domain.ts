/**
 * Finds the widest domain a first-party cookie can be set on (shop.example.com → example.com), the way Snowplow's
 * discoverRootDomain and Google's cookie_domain "auto" do: try each parent from the shortest and keep the first the
 * browser accepts. Public suffixes such as co.uk are rejected by the browser itself.
 */

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export const candidateDomains = (hostname: string): string[] => {
  const host = hostname.toLowerCase();
  if (host.indexOf(".") === -1 || IPV4.test(host) || host.indexOf(":") !== -1 || host.charAt(0) === "[") return [];
  const labels = host.split(".");
  const candidates: string[] = [];
  for (let i = labels.length - 2; i >= 0; i--) candidates.push(labels.slice(i).join("."));
  return candidates;
};

/** The first candidate `canSet` accepts, or null for a host-only cookie. */
export const discoverCookieDomain = (hostname: string, canSet: (domain: string) => boolean): string | null => {
  const candidates = candidateDomains(hostname);
  for (let i = 0; i < candidates.length; i++) {
    if (canSet(candidates[i])) return candidates[i];
  }
  return null;
};
