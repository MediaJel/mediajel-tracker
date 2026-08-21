/* global XMLHttpRequestBodyInit */
/* ^ eslint no-undef: DOM lib types used in type positions; the shared config declares no TS-lib globals (same debt tracker-core carries). */
import { guard } from "@mediajel/tracker-core/utils/guard";
import { formatXhrPayload } from "@mediajel/tracker-core/sources/xhr-request-source";
import { categorize, isOwnTraffic, peekTrackerEvent } from "@mediajel/tracker-widget/recorder/classify";
import { Source } from "@mediajel/tracker-widget/recorder/recorder";
import { maskText } from "@mediajel/tracker-widget/session/masking";

/**
 * One prototype patch for both halves of an XHR: `open` remembers method/url on the instance,
 * `send` remembers the body and listens for `load`. tracker-core splits these across two
 * sources; the recorder wants them joined so a row can say "POST /checkout → 200" in one line.
 */

const CAPTURE_CAP = 4_096;

interface TaggedXhr extends XMLHttpRequest {
  __mjMethod?: string;
  __mjUrl?: string;
  __mjStartedAt?: number;
}

export const xhrSource: Source = ({ widget, emit }) => {
  const proto = XMLHttpRequest.prototype;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  let disposed = false;

  proto.open = function (this: TaggedXhr, method: string, url: string | URL, ...rest: unknown[]) {
    this.__mjMethod = String(method).toUpperCase();
    this.__mjUrl = String(url);

    return (originalOpen as any).call(this, method, url, ...rest);
  };

  proto.send = function (this: TaggedXhr, body?: Document | XMLHttpRequestBodyInit | null) {
    this.__mjStartedAt = Date.now();
    this.addEventListener(
      "load",
      guard(() => {
        if (disposed) return;
        const url = this.__mjUrl ?? "";
        if (isOwnTraffic(url)) return;

        let reqBody = "";
        if (body != null) {
          const formatted = formatXhrPayload(body);
          reqBody = typeof formatted === "string" ? formatted : (JSON.stringify(formatted) ?? "");
        }
        let resBody = "";
        try {
          // responseText throws for responseType "arraybuffer"/"blob"/"document".
          if (this.responseType === "" || this.responseType === "text") resBody = this.responseText;
          else if (this.responseType === "json") resBody = JSON.stringify(this.response) ?? "";
        } catch {
          resBody = "[unreadable]";
        }

        const category = categorize(url, widget.tag);
        const tracker = category === "tracker" ? peekTrackerEvent(`${url} ${reqBody}`) : null;
        emit(
          {
            kind: "network",
            sub: "xhr",
            method: this.__mjMethod ?? "GET",
            url,
            status: this.status,
            reqType: "",
            reqBody: maskText(reqBody.slice(0, CAPTURE_CAP)),
            resType: this.getResponseHeader("content-type") ?? "",
            resBody: maskText(resBody.slice(0, CAPTURE_CAP)),
            ms: Date.now() - (this.__mjStartedAt ?? Date.now()),
            category,
            summary:
              category === "tracker"
                ? `tracker sent ${tracker ?? "an event"}`
                : `${this.__mjMethod ?? "GET"} ${url} → ${this.status}`,
          },
          { flush: true, scoreText: `${url} ${reqBody} ${resBody}` },
        );
      }, "xhr-record"),
    );
    return originalSend.call(this, body as Document | XMLHttpRequestBodyInit | null);
  };

  return () => {
    disposed = true;
    proto.open = originalOpen;
    proto.send = originalSend;
  };
};
