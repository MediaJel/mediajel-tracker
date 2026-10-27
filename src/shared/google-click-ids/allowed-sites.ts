/**
 * Temporary rollout list: click-ID persistence runs only on these sites and their subdomains while it is proven out.
 *
 * They are the sites of the Google Ads accounts that had ad clicks in the 90 days to 2026-10-25: each account's ad
 * landing domains (its Google Ads landing pages) and the store domains its MediaJel tag runs on. Platforms that many
 * companies share (dutchie.com, dispenseapp.com, …) are never listed; a menu one of them embeds in a listed page runs it
 * anyway (see gate.ts). A tag on any other site opts in with clickIds=true.
 *
 * To turn it on for every site, delete this list and its check in gate.ts.
 */
import { withinDomain } from "./domain";

export const ALLOWED_SITES: string[] = [
  // Catalyst
  "visitcatalyst.com",
  "catalystretails.com",
  "catalyst-cannabis.com",
  // Curio Wellness
  "shopfardotter.com",
  "shopfardottermd.com",
  "curiogreenlight.com",
  "findcuriomissouri.com",
  "fardotter.com",
  "greenlightdispensary.com",
  // The Landing
  "thelandinginohio.com",
  "thelandinginwv.com",
  "thelandingdispensaries.com",
  "thelandingwv.com",
  // Shangri-La
  "visitshangrila.com",
  "shangriladispensaries.com",
  "shop-shangrila.com",
  "shopshangrila.com",
  // Terrabis
  "discoverterrabis.com",
  "discoverterrabismundelein.com",
  "terrabis.co",
  // Mission
  "exploremissiondisp.com",
  "missiondispensaries.com",
  "thejointdispo.com",
  // Mankind
  "trymankindtoday.com",
  // Daylite
  "daylitenj.com",
  "daylitecannabis.com",
  // Forecast Grade
  "getforecastgrade.com",
  // Key
  "discoverkeyproducts.com",
  "keycannabis.com",
  // Fly DNG
  "findurbproducts.com",
  // Union Chill (NY)
  "visitunionchillcorning.com",
  "unionchillny.com",
  // OnSpot Data
  "onspotdata.com",
  // Whitman County Public Health
  "whitmancountypublichealth.org",
  // Sweetspot
  "findsweetspotfarms.com",
  "sweetspotfarms.com",
];

/** True for a listed site or any subdomain of one; `sites` replaces the built-in list (tests). */
export const onAllowedSite = (hostname: string, sites: string[] = ALLOWED_SITES): boolean => {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return !!host && sites.some((site) => withinDomain(host, site));
};
