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
export const IMPORT_ALLOWLIST: Record<string, readonly string[]> = {
  "../libs/utils/is-trackTrans-loaded": ["isTrackTransLoaded"],
  "../libs/utils/is-tracker-loaded": ["isTrackerLoaded"],
  "../libs/sources/google-datalayer-source": ["datalayerSource"],
  "../libs/sources/poll-for-element": ["pollForElement"],
  "../libs/sources/xhr-response-source": ["xhrResponseSource"],
  "../libs/sources/fetch-source": ["fetchSource"],
  "../libs/sources/post-message-source": ["postMessageSource"],
  "../libs/utils/sha256-encode": ["sha256"],
  "../libs/utils/tryParseJSONObject": ["tryParseJSONObject"],
};

export interface RewriteResult {
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

  let js = code.replace(IMPORT_RE, (whole, named: string | undefined, dflt: string | undefined, specifier: string) => {
    const allowed = IMPORT_ALLOWLIST[specifier];
    if (!allowed) {
      errors.push(`import from "${specifier}" is not on the allowlist`);
      return `/* removed: ${whole.trim()} */`;
    }
    specifiers.push(specifier);

    if (dflt) {
      // Default imports exist for none of the allowlisted helpers.
      errors.push(`"${specifier}" has no default export (imported as ${dflt})`);
      return `/* removed: ${whole.trim()} */`;
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
