import { PluginParams } from "src/shared/types";

const KNOWN_PLUGINS = ["googleAds", "bingAds"];

/**
 * Plugins named in the tag's `plugin` param, or in `plugins` (an alias the help-center docs and some override files
 * used). Names are trimmed and matched case-insensitively; unknown names are ignored.
 */
export const parsePlugins = (context: PluginParams): string[] => {
  const requested = [context.plugin, context.plugins]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((name) => name.trim().toLowerCase());
  return KNOWN_PLUGINS.filter((plugin) => requested.indexOf(plugin.toLowerCase()) !== -1).sort(
    (a, b) => requested.indexOf(a.toLowerCase()) - requested.indexOf(b.toLowerCase()),
  );
};
