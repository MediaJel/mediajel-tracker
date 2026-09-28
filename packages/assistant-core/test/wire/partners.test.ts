import { describe, expect, test } from "bun:test";

import type { TagRecord } from "@mediajel/assistant-core/tags";
import { attributePartner } from "@mediajel/assistant-core/wire/partners";
import type { PartnerSignal } from "@mediajel/assistant-core/wire/types";

import { PARTNER_HOSTS, recognisePartner } from "@mediajel/assistant-core/wire/partners";

/**
 * The partner pixels the tag fires, read back off their own hosts. The URLs are the templates in
 * tracker-core's segment builders with terrabis.co's values in them, as observed on the wire
 * (2026-09-19), and the shapes Bing's UET documents.
 */

const DSTILLERY =
  "https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=TerrabisMundelein-S3.PV&ncv=76";

describe("recognising a partner request", () => {
  test("Nexxen: a page-view beacon names its segment; a purchase carries the order and its amount", () => {
    expect(recognisePartner("https://r.turn.com/r/beacon?b2=ezo6F0kqQm2p")).toEqual({
      source: "partner",
      partner: "nexxen",
      purpose: "audience",
      segment: "ezo6F0kqQm2p",
      unconfigured: false,
      companion: false,
      url: "https://r.turn.com/r/beacon?b2=ezo6F0kqQm2p",
      appId: "",
      pageUrl: "",
    });
    expect(recognisePartner("https://r.turn.com/r/beacon?b2=bVey-3fRZmk1&cid=T4821&bprice=84")).toMatchObject({
      partner: "nexxen",
      purpose: "conversion",
      segment: "bVey-3fRZmk1",
      order: { id: "T4821", amount: "84" },
    });
  });

  test("Dstillery: a page-view pixel, a purchase pixel, and the tag's own default of 00000", () => {
    expect(recognisePartner(DSTILLERY)).toMatchObject({
      partner: "dstillery",
      purpose: "audience",
      segment: "TerrabisMundelein-S3.PV",
      unconfigured: false,
      companion: false,
      // The URL is kept masked the way a recording is: the advertiser id has the shape of a phone
      // number, and the sweep cannot know it is not one. The segment is on the row as it was sent.
      url: "https://action.dstillery.com/orbserv/nsjs?adv=cl1***-5365&ns=8779&nc=TerrabisMundelein-S3.PV&ncv=76",
    });
    expect(recognisePartner(DSTILLERY)).not.toHaveProperty("order");
    expect(
      recognisePartner(
        "https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=TerrabisMundelein-S3.TR&ncv=76&dstOrderId=T4821&dstOrderAmount=84",
      ),
    ).toMatchObject({
      partner: "dstillery",
      purpose: "conversion",
      segment: "TerrabisMundelein-S3.TR",
      order: { id: "T4821", amount: "84" },
    });
    expect(
      recognisePartner("https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=00000&ncv=76"),
    ).toMatchObject({ partner: "dstillery", segment: "00000", unconfigured: true });
  });

  test("the same Dstillery pixel on media6degrees is its companion, not a second configuration", () => {
    expect(recognisePartner(DSTILLERY.replace("action.dstillery.com", "action.media6degrees.com"))).toMatchObject({
      partner: "dstillery",
      purpose: "audience",
      segment: "TerrabisMundelein-S3.PV",
      companion: true,
    });
  });

  test("LiquidM: a cookie sync naming the segment", () => {
    expect(
      recognisePartner(
        "https://tracking.lqm.io/odin/handle_sync.js?seg=bLeKCx2Vm0S5qAaJ7dE1fw&gdpr=0&gdpr_consent=&cb=1758294000000",
      ),
    ).toMatchObject({ partner: "liquidm", purpose: "sync", segment: "bLeKCx2Vm0S5qAaJ7dE1fw" });
  });

  test("Bing: the loader, then the beacons naming the tag on a page load and on a conversion", () => {
    expect(recognisePartner("https://bat.bing.com/bat.js")).toMatchObject({
      partner: "bing",
      purpose: "loader",
      segment: "",
    });
    expect(recognisePartner("https://bat.bing.com/action/0?ti=12345678&Ver=2&evt=pageLoad")).toMatchObject({
      partner: "bing",
      purpose: "audience",
      segment: "12345678",
    });
    expect(recognisePartner("https://bat.bing.com/action/0?ti=12345678&Ver=2&evt=custom&ea=purchase")).toMatchObject({
      partner: "bing",
      purpose: "conversion",
      segment: "12345678",
    });
  });

  test("any other host, and anything that is not a URL, is no partner", () => {
    expect(recognisePartner("https://collector-azsx401.dmp.cnna.io/analytics/track")).toBeNull();
    expect(recognisePartner("https://match.adsrvr.org/track/cmf/generic?ttd_pid=x")).toBeNull();
    expect(recognisePartner("https://turn.com/r/beacon?b2=x")).toBeNull();
    expect(recognisePartner("not a url")).toBeNull();
  });

  test("names the hosts the capture listens on — the five the tag's templates go to", () => {
    expect(PARTNER_HOSTS).toEqual([
      "r.turn.com",
      "action.dstillery.com",
      "action.media6degrees.com",
      "tracking.lqm.io",
      "bat.bing.com",
    ]);
  });
});

describe("which tag a partner signal belongs to", () => {
  const tag = (appId: string, params: Record<string, string>): TagRecord => ({
    appId,
    state: "sending",
    environment: "production",
    version: "2",
    event: "",
    announced: false,
    firstSeenAt: 0,
    collector: "",
    enabled: true,
    config: { params, src: "", element: "", source: "script" },
  });
  const signal = (partner: PartnerSignal["partner"], segment: string): PartnerSignal => ({
    id: "p1",
    seq: 1,
    at: 0,
    request: "p1",
    pageKey: "doc",
    pageUrl: "",
    appId: "",
    outcome: { kind: "pending" },
    source: "partner",
    partner,
    purpose: "audience",
    segment,
    unconfigured: false,
    companion: false,
    url: "",
  });

  test("the tag whose configured segment it carries, by the parameter that named it", () => {
    const tags = [tag("a", { "s3.pv": "A-PV" }), tag("b", { "s3.pv": "B-PV", "s2.tr": "B-TR" })];
    expect(attributePartner(signal("dstillery", "B-PV"), tags)).toEqual({ appId: "b", param: "s3.pv", how: "matched" });
    expect(attributePartner(signal("nexxen", "B-TR"), tags)).toEqual({ appId: "b", param: "s2.tr", how: "matched" });
    expect(attributePartner(signal("liquidm", "seg"), [tag("c", { segmentId: "seg" })])).toEqual({
      appId: "c",
      param: "segmentId",
      how: "matched",
    });
  });

  test("the page's only tag when nothing names the segment, and no tag at all otherwise", () => {
    expect(attributePartner(signal("dstillery", "00000"), [tag("a", {})])).toEqual({
      appId: "a",
      param: null,
      how: "sole-tag",
    });
    expect(attributePartner(signal("dstillery", "00000"), [tag("a", {}), tag("b", {})])).toEqual({
      appId: "",
      param: null,
      how: "none",
    });
    expect(attributePartner(signal("dstillery", "00000"), [])).toEqual({ appId: "", param: null, how: "none" });
  });
});
