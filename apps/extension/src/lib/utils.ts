import { createCn } from "cn/config";

/**
 * `cn` — clsx-style joining with Tailwind conflict resolution (shadcn's engine), told about the
 * panel's own scale. Its defaults know Tailwind's stock names; a `text-title` or a `tracking-stamp`
 * would otherwise read as a colour or an unknown, and a later `text-foreground` would drop the
 * size along with the colour it meant to replace.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["3xs", "2xs", "md", "title"] }],
      tracking: [{ tracking: ["caps", "stamp", "label"] }],
      shadow: [{ shadow: ["press", "bar", "choice", "guess"] }],
    },
  },
});
