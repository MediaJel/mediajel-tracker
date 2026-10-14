import { useEffect } from "react";

import { ThemeChoice } from "~/store/settings";

/**
 * Stamps the operator's theme choice on the document.
 *
 * "System" stamps nothing, which is what lets the `prefers-color-scheme` block in the
 * stylesheet decide. An explicit choice stamps the attribute the two `[data-theme]` blocks
 * key off, so it wins in both directions — including choosing light on a machine set to dark.
 */
export const useTheme = (theme: ThemeChoice): void => {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);
};
