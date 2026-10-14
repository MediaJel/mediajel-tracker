/* global BodyInit */
/* ^ eslint no-undef: DOM lib types used in type positions; the shared config declares no TS-lib globals (same debt tracker-core carries). */
import { guard } from "@mediajel/tracker-core/utils/guard";
import { categorize, isOwnTraffic } from "@mediajel/assistant-core/recorder/classify";
import { Source } from "@mediajel/assistant-core/recorder/recorder";
import { maskText } from "@mediajel/assistant-core/session/masking";

/** `sendBeacon` is how checkouts report conversions on the way out the door. */
export const beaconSource: Source = ({ page, emit }) => {
  if (!("sendBeacon" in navigator)) return () => undefined;

  const original = navigator.sendBeacon.bind(navigator);
  let disposed = false;

  navigator.sendBeacon = function (url: string | URL, data?: BodyInit | null): boolean {
    const accepted = original(url, data);
    if (!disposed && !isOwnTraffic(String(url))) {
      guard(() => {
        const body = typeof data === "string" ? data : data instanceof URLSearchParams ? data.toString() : "";
        emit(
          {
            kind: "network",
            sub: "beacon",
            method: "POST",
            url: String(url),
            status: accepted ? 0 : -1,
            reqType: "",
            reqBody: maskText(body.slice(0, 2_048)),
            resType: "",
            resBody: "",
            ms: 0,
            category: categorize(String(url), page.tag),
            summary: `beacon ${String(url)}`,
          },
          { flush: true, scoreText: `${String(url)} ${body}` },
        );
      }, "beacon-record")();
    }
    return accepted;
  };

  return () => {
    disposed = true;
    navigator.sendBeacon = original;
  };
};
