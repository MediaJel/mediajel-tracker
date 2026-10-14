import type { TagRecord } from "@mediajel/assistant-core/tags";
import type { Decoded, PartnerSignal, Partner } from "@mediajel/assistant-core/wire/types";
import { maskedUrl, parseUrl } from "@mediajel/assistant-core/wire/url";

/**
 * The partner pixels the tag fires from its segment parameters, read back off the wire.
 *
 * Each partner is heard on its own host, and the request says what it is by the shape the tag's
 * template gave it (`segment-builder/segments/*.ts` and the Bing UET extension in tracker-core):
 * Nexxen's beacon names its segment in `b2` and carries `cid` and `bprice` on a purchase;
 * Dstillery's names it in `nc` — `00000` being the tag's own default when the page configured
 * none — and carries `dstOrderId` and `dstOrderAmount` on a purchase, with the same pixel on
 * media6degrees, its companion host; LiquidM's cookie sync names it in `seg`; Bing loads `bat.js`
 * and then names its tag in `ti`. None of them carries an app ID: which tag fired one is read
 * by the panel against each tag's configuration, never guessed here.
 */

type Signal = Decoded<PartnerSignal>;

/** What one partner's request says, before the parts every signal shares are filled in. */
type Reading = Pick<Signal, "partner" | "purpose" | "segment"> &
  Partial<Pick<Signal, "order" | "unconfigured" | "companion">>;

const param = (url: URL, key: string): string => url.searchParams.get(key) ?? "";

const orderOf = (id: string, amount: string): Pick<Signal, "order"> => (id === "" ? {} : { order: { id, amount } });

/** Nexxen: `b2` names the beacon; a `cid` makes it a conversion, with `bprice` the amount. */
const nexxen = (url: URL): Reading => {
  const cid = param(url, "cid");
  return {
    partner: "nexxen",
    purpose: cid === "" ? "audience" : "conversion",
    segment: param(url, "b2"),
    ...orderOf(cid, param(url, "bprice")),
  };
};

/** Dstillery: `nc` names the segment; a `dstOrderId` makes it a conversion, with `dstOrderAmount` the amount. */
const dstillery = (url: URL): Reading => {
  const id = param(url, "dstOrderId");
  const nc = param(url, "nc");
  return {
    partner: "dstillery",
    purpose: id === "" ? "audience" : "conversion",
    segment: nc,
    unconfigured: nc === "00000",
    ...orderOf(id, param(url, "dstOrderAmount")),
  };
};

/** The Dstillery pixel again, on the partner's companion host. */
const media6degrees = (url: URL): Reading => ({ ...dstillery(url), companion: true });

/** LiquidM: a cookie-sync script naming the segment in `seg`. */
const liquidm = (url: URL): Reading => ({ partner: "liquidm", purpose: "sync", segment: param(url, "seg") });

/** Bing UET: `bat.js` is the loader; every beacon after it names the tag in `ti`, `evt=pageLoad` on a page view. */
const bing = (url: URL): Reading =>
  url.pathname.endsWith("/bat.js")
    ? { partner: "bing", purpose: "loader", segment: "" }
    : {
        partner: "bing",
        purpose: param(url, "evt") === "pageLoad" ? "audience" : "conversion",
        segment: param(url, "ti"),
      };

/** Each partner host, and how to read a request to it. */
const READERS: Record<string, (url: URL) => Reading> = {
  "r.turn.com": nexxen,
  "action.dstillery.com": dstillery,
  "action.media6degrees.com": media6degrees,
  "tracking.lqm.io": liquidm,
  "bat.bing.com": bing,
};

/** The hosts the tag's partner requests go to, so the capture can listen on exactly these. */
export const PARTNER_HOSTS: string[] = Object.keys(READERS);

/** What a request to a partner's host is — its purpose, and the segment it names — or null for any other URL. */
export const recognisePartner = (url: string): Signal | null => {
  const parsed = parseUrl(url);
  const read = parsed && READERS[parsed.hostname];
  if (!read) return null;
  return {
    source: "partner",
    unconfigured: false,
    companion: false,
    ...read(parsed),
    url: maskedUrl(url),
    appId: "",
    pageUrl: "",
  };
};

/** The parameters a partner's segment can come from, in the order the tag reads them. */
const SEGMENT_PARAMS: Record<Partner, string[]> = {
  nexxen: ["s2.pv", "s2.tr", "s2"],
  dstillery: ["s3.pv", "s3.tr", "s3"],
  liquidm: ["segmentId", "s1"],
  bing: ["tagId"],
};

export interface Attribution {
  appId: string;
  /** The parameter whose configured value the signal carried, when one did. */
  param: string | null;
  how: "matched" | "sole-tag" | "none";
}

const matchIn = (tag: TagRecord, params: string[], segment: string): string | null =>
  params.find((param) => tag.config?.params[param] === segment) ?? null;

/**
 * Which tag a partner signal belongs to: the one whose configured segment it carries, else the
 * page's only tag. Worked out from the tags known now, because the pixels fire before the record
 * event that names the segments lands — a stored guess would have frozen a wrong answer.
 */
export const attributePartner = (signal: PartnerSignal, tags: TagRecord[]): Attribution => {
  for (const tag of tags) {
    const param = matchIn(tag, SEGMENT_PARAMS[signal.partner], signal.segment);
    if (param) return { appId: tag.appId, param, how: "matched" };
  }
  return tags.length === 1
    ? { appId: tags[0].appId, param: null, how: "sole-tag" }
    : { appId: "", param: null, how: "none" };
};
