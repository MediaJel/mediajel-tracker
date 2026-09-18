/**
 * Turns a frictionless tag file into something runnable ON the page it was written for:
 * allowlisted `import { a, b as c } from "../libs/…"` lines become destructures from the
 * shim table (`__mjShims`), everything else is a hard error, and the result is wrapped in a
 * function so `new Function` can parse-check the EXACT text that would be deployed.
 *
 * This is also the deploy gate's parser: a file that cannot be rewritten and parsed here is
 * a file that must never reach the frictionless repo, where a syntax error freezes every
 * future tag deploy.
 */

/** The only specifiers a generated tag may import, and the names each one exports. */
const IMPORT_ALLOWLIST: Record<string, readonly string[]> = {
  "../libs/utils/is-trackTrans-loaded": ["isTrackTransLoaded"],
  "../libs/utils/is-tracker-loaded": ["isTrackerLoaded"],
  "../libs/sources/google-datalayer-source": ["datalayerSource"],
  "../libs/sources/ecomm-datalayer-source": ["ecommDatalayerSource"],
  "../libs/sources/poll-for-element": ["pollForElement"],
  "../libs/sources/xhr-response-source": ["xhrResponseSource"],
  "../libs/sources/xhr-request-source": ["xhrRequestSource"],
  // The one helper the tags repo exports BOTH ways, and `import fetchSource from` is the
  // commoner of the two in shipped tags. "default" here is the default export, not a name.
  "../libs/sources/fetch-source": ["fetchSource", "default"],
  "../libs/sources/post-message-source": ["postMessageSource"],
  "../libs/sources/get-beacons": ["getBeacons"],
  "../libs/utils/url-detector": ["waitForUrlSubstring"],
  "../libs/utils/create-image-pixel": ["createImagePixel"],
  "../libs/utils/create-script-pixel": ["createScript"],
  "../libs/utils/persist-utm": ["createUTMPersistor"],
  "../libs/utils/sha256-encode": ["sha256"],
  "../libs/utils/tryParseJSONObject": ["tryParseJSONObject"],
};

/**
 * The tags repo resolves BOTH `../libs/x` and `/src/libs/x`: its tsconfig maps `"/*": ["*"]` to
 * match Parcel's dependency resolution, and 22 shipped tags use the second spelling. Folding
 * them onto one key keeps a single allowlist and a single shim table — two spellings of the
 * same security boundary is the hole this file exists to prevent.
 */
const canonicalSpecifier = (specifier: string): string => specifier.replace(/^\/src\/libs\//, "../libs/");

interface RewriteResult {
  /** The runnable body: imports replaced, `export ` stripped, otherwise byte-identical. */
  js: string;
  /** Specifiers the file imported, in order. */
  specifiers: string[];
  errors: string[];
}

const IMPORT_RE = /^[ \t]*import\s+(?:\{([^}]*)\}|([A-Za-z_$][\w$]*))\s+from\s+["']([^"']+)["'];?[ \t]*$/gm;
const OTHER_IMPORT_RE = /^[ \t]*import\b/m;
const EXPORT_RE = /^([ \t]*)export\s+(const|let|function)/gm;

export const rewriteImports = (code: string): RewriteResult => {
  const specifiers: string[] = [];
  const errors: string[] = [];

  let js = code.replace(IMPORT_RE, (whole, named: string | undefined, dflt: string | undefined, raw: string) => {
    const specifier = canonicalSpecifier(raw);
    const allowed = IMPORT_ALLOWLIST[specifier];
    if (!allowed) {
      errors.push(`import from "${specifier}" is not on the allowlist`);
      return `/* removed: ${whole.trim()} */`;
    }
    specifiers.push(specifier);

    if (dflt) {
      if (!allowed.includes("default")) {
        errors.push(`"${specifier}" has no default export (imported as ${dflt})`);
        return `/* removed: ${whole.trim()} */`;
      }
      return `const ${dflt} = __mjShims["${specifier}"].default;`;
    }

    const bindings = (named ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [imported, local] = part.split(/\s+as\s+/).map((token) => token.trim());
        if (!allowed.includes(imported)) errors.push(`"${specifier}" does not export ${imported}`);
        return local ? `${imported}: ${local}` : imported;
      });

    return `const { ${bindings.join(", ")} } = __mjShims["${specifier}"];`;
  });

  // Cross-referenced app-id files export their function; runnable text must not.
  js = js.replace(EXPORT_RE, "$1$2");

  if (OTHER_IMPORT_RE.test(js)) errors.push("an import statement survived the rewrite (unsupported form)");

  return { js: `(function (__mjShims) {\n"use strict";\n${js}\n})(window.__mjWidgetShims || {});`, specifiers, errors };
};

/**
 * The parse gate. Returns null when the rewritten text parses, else the SyntaxError message.
 * `new Function` never RUNS the code — it only compiles it.
 */
export const parseGate = (rewrittenJs: string): string | null => {
  try {
    new Function(rewrittenJs);
    return null;
  } catch (err) {
    return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }
};
