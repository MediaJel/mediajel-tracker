import { describe, expect, test } from "bun:test";

import { TAG_URL_ATTRIBUTES } from "@mediajel/assistant-core/context";

import { copyTagScripts } from "~/background/page-tags";

/**
 * The half of reading a page's tags that runs inside the page. Chrome sends it there as source
 * text, so what matters is what it copies out — and that it still works with nothing around it.
 */

const MARKUP = [
  // www.eaze.com, as next/script inserts it after hydration.
  `<script src="https://tags.cnna.io/?appId=Eaze&version=2" id="mediajel" data-nscript="afterInteractive"></script>`,
  // A tag WP Rocket is holding back.
  `<script type="text/rocketlazyloadscript" data-rocket-src="https://tags.cnna.io?appId=held&version=2"></script>`,
  // Inline code carries no URL, however large it is.
  `<script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>`,
].join("");

describe("copying a page's scripts out of it", () => {
  test("copies every script that carries a URL, and only those", () => {
    document.head.innerHTML = MARKUP;
    try {
      const copies = copyTagScripts(TAG_URL_ATTRIBUTES);

      expect(copies).toHaveLength(2);
      expect(copies[0].attributes.src).toBe("https://tags.cnna.io/?appId=Eaze&version=2");
      expect(copies[1].attributes["data-rocket-src"]).toBe("https://tags.cnna.io?appId=held&version=2");
      expect(copies[0].baseURI).toBe(document.baseURI);
    } finally {
      document.head.innerHTML = "";
    }
  });

  test("uses nothing from this module — Chrome runs it from its source text alone", () => {
    document.head.innerHTML = MARKUP;
    try {
      const alone = new Function(`return (${copyTagScripts.toString()});`)() as typeof copyTagScripts;
      expect(alone(TAG_URL_ATTRIBUTES)).toEqual(copyTagScripts(TAG_URL_ATTRIBUTES));
    } finally {
      document.head.innerHTML = "";
    }
  });
});
