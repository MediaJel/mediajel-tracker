import { Source } from "@mediajel/assistant-core/recorder/recorder";

/**
 * One snapshot of what the page is built on, taken when recording starts. It rides the prompt
 * so the model knows "this is Shopify" without being told, and Review shows it as context.
 */

const PROBES: { name: string; test: () => boolean }[] = [
  { name: "Shopify", test: () => "Shopify" in window },
  {
    name: "WooCommerce",
    test: () =>
      "wc_add_to_cart_params" in window ||
      "woocommerce_params" in window ||
      document.body.classList.contains("woocommerce"),
  },
  { name: "BigCommerce", test: () => "BCData" in window || "stencilUtils" in window },
  { name: "Wix", test: () => "wixDevelopersAnalytics" in window },
  {
    name: "Squarespace",
    test: () =>
      "Static" in window &&
      !!(window as unknown as { Static?: { SQUARESPACE_CONTEXT?: unknown } }).Static?.SQUARESPACE_CONTEXT,
  },
  { name: "Webflow", test: () => "Webflow" in window },
  { name: "WordPress", test: () => !!document.querySelector('meta[name="generator"][content*="WordPress" i]') },
  { name: "Magento", test: () => !!document.querySelector("script[src*='mage' i], [data-mage-init]") },
  { name: "Next.js", test: () => "__NEXT_DATA__" in window },
  { name: "Nuxt", test: () => "__NUXT__" in window },
  { name: "Dutchie (iframe)", test: () => !!document.querySelector("iframe[src*='dutchie.com']") },
  { name: "Jane (iframe)", test: () => !!document.querySelector("iframe[src*='iheartjane.com']") },
  { name: "Google Tag Manager", test: () => "google_tag_manager" in window },
];

export const platformSource: Source = ({ page, emit }) => {
  const globals: string[] = [];
  for (const probe of PROBES) {
    try {
      if (probe.test()) globals.push(probe.name);
    } catch {
      /* a hostile getter must not cost the snapshot */
    }
  }

  const detected = globals.find((name) => !["Google Tag Manager", "Next.js", "Nuxt", "WordPress"].includes(name)) ?? "";
  const spa = "__NEXT_DATA__" in window || "__NUXT__" in window;

  emit({
    kind: "platform",
    detected,
    globals,
    spa,
    summary: detected
      ? `platform: ${detected}${globals.length > 1 ? ` (+${globals.length - 1} signals)` : ""}`
      : `platform: unknown (${globals.join(", ") || "no known globals"})${page.tag.environment ? ` · tag environment=${page.tag.environment}` : ""}`,
  });

  return () => undefined;
};
