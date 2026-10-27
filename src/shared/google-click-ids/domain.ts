/** `host` is `domain` or one of its subdomains. Its own module: the entry script's rollout check needs only this. */
export const withinDomain = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);
