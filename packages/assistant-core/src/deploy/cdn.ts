import { guard } from "@mediajel/tracker-core/utils/guard";
import { DeployTargetKind } from "@mediajel/assistant-core/deploy/targets";

/**
 * Where the deployed tag will be served from — the exact URL the tag builds (standard base64
 * WITH padding, see tracker-core/utils/get-custom-tags.ts) — and a poller that tells the
 * operator when the repo's CI has put it there.
 *
 * The CDN base is passed in rather than read from the environment: the same code runs in an
 * extension build and in tests, and only the caller knows which.
 */

export const cdnUrl = (base: string, kind: DeployTargetKind, name: string): string | null => {
  if (!base) return null;
  return `${base}/${kind === "domain" ? "domains" : "app-ids"}/${btoa(name)}.js`;
};

export interface CdnPoller {
  stop(): void;
}

export type CdnState = "live" | "waiting" | "gave-up";

/** Polls every 30s for up to 10 minutes; reports "live" | "waiting" | "gave-up". */
export const pollCdn = (url: string, onChange: (state: CdnState) => void): CdnPoller => {
  const startedAt = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;

  const check = guard(async (): Promise<void> => {
    try {
      const response = await fetch(`${url}?mj-widget-probe=${Date.now()}`, { method: "GET", cache: "no-store" });
      if (response.ok) {
        onChange("live");
        stop();
        return;
      }
    } catch {
      /* not there yet — keep waiting */
    }
    if (Date.now() - startedAt > 10 * 60 * 1000) {
      onChange("gave-up");
      stop();
      return;
    }
    onChange("waiting");
  }, "cdn-poll");

  const stop = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };

  timer = setInterval(() => void check(), 30_000);
  void check();
  return { stop };
};
