import { ApiError } from "../errors";

/**
 * A tag's configuration, edited in the assistant, as the block of code that carries it in the
 * tag's app-id file.
 *
 * The tag reads `window.overrides` once, after the domain file and then the app-id file have run
 * (`apps/tracker/src/index.ts`): an array → the entry whose `tag`/`appId` matches; an object → its
 * `[appId]` entry when there is one, else the whole object as flat overrides for every tag; none →
 * `s3.pv`/`s3.tr` default to "00000" when the tag's URL lacks them. The frictionless repo uses every
 * one of those shapes, usually by assigning `window.overrides` wholesale.
 *
 * So the block never assigns over what is there. It runs last — the app-id file is the last code the
 * tag runs before reading — and merges the edits into whatever the files set, for this tag alone:
 * into its array entry, into its keyed entry, or, over a flat object, into a NON-ENUMERABLE keyed
 * entry built from the flat values, which this tag reads by key while every other tag, spreading the
 * whole object, never sees it. It is synchronous, fetches nothing, and swallows its own errors, so
 * the file's code before it and the tag after it run as they did whatever happens inside it.
 *
 * Every byte of it is rendered here. The panel sends data — an app ID and the edited params — and
 * gets back the exact text that the preview shows, the page runs when the edit is tried, and the
 * commit writes.
 *
 * Each block carries a version — a hash of its app ID and edits. While an engineer tries an edit on a
 * page, the extension names the version it is trying in `window.__mediajelAssistantOverrides`, and a
 * deployed block of another version for the same tag stands aside, so the page runs exactly what the
 * deploy would leave in the file — including an edit taken back out. Nothing sets that name on a
 * visitor's page, so there every block runs.
 */

const MARK = "mediajel-assistant:overrides";

const beginOf = (appId: string): string => `/* ${MARK} ${appId} begin`;
const endOf = (appId: string): string => `/* ${MARK} ${appId} end */`;

/** What runs, for any app ID and any edits: plain ES5, valid as JavaScript and as TypeScript. */
const BODY = `(function (appId, edits, version) {
  try {
    var tried = window["__mediajelAssistantOverrides"];
    if (tried && tried[appId] && tried[appId] !== version) return;
    var has = Object.prototype.hasOwnProperty;
    var copy = function (from, into) {
      for (var key in from) if (has.call(from, key)) into[key] = from[key];
      return into;
    };
    var edited = function (base) {
      return copy(edits, copy(base, {}));
    };
    var hide = function (holder, value) {
      Object.defineProperty(holder, appId, { value: value, enumerable: false, configurable: true, writable: true });
    };
    var current = window.overrides;
    if (Array.isArray(current)) {
      for (var i = 0; i < current.length; i += 1) {
        if (current[i] && (current[i].tag === appId || current[i].appId === appId)) {
          current[i] = edited(current[i]);
          return;
        }
      }
      current.push(edited({ appId: appId }));
      return;
    }
    if (current && typeof current === "object") {
      if (current[appId] && typeof current[appId] === "object") {
        current[appId] = edited(current[appId]);
        return;
      }
      var flat = {};
      for (var name in current) if (has.call(current, name) && typeof current[name] !== "object") flat[name] = current[name];
      hide(current, edited(flat));
      return;
    }
    var defaults = {};
    var scripts = document.getElementsByTagName("script");
    for (var s = 0; s < scripts.length; s += 1) {
      var src = scripts[s].src || "";
      var query = new URLSearchParams(src.substring(src.indexOf("?")));
      if ((query.get("appId") || query.get("mediajelAppId")) === appId) {
        if (!query.get("s3.pv")) defaults["s3.pv"] = "00000";
        if (!query.get("s3.tr")) defaults["s3.tr"] = "00000";
        break;
      }
    }
    window.overrides = {};
    hide(window.overrides, edited(defaults));
  } catch (error) {
    if (window.console) window.console.warn("[MediaJel] The assistant's overrides for " + appId + " were not applied:", error);
  }
})`;

/**
 * A literal the oldest browsers the tag supports can parse: JSON, with the two line separators
 * that were not legal inside a string literal before ES2019 escaped.
 */
const literal = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/** The edits in key order, so the same edit always renders the same bytes. */
const sorted = (edits: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.keys(edits)
      .sort()
      .map((key) => [key, edits[key]]),
  );

/** FNV-1a, 32 bits: enough to tell one edit from another, the same in every runtime. */
const fnv = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

/** The version a block for these edits carries: the same edits, the same version. */
export const versionOf = (appId: string, edits: Record<string, string>): string =>
  `v-${fnv(`${appId}\n${JSON.stringify(sorted(edits))}`)}`;

/**
 * The block for one tag. It opens with a semicolon, so a file that ends in a bare call — `fn()`, no
 * semicolon — is not continued into it, and it never ends in a newline, which the splice supplies.
 */
export const renderBlock = (appId: string, edits: Record<string, string>): string =>
  [
    `;${beginOf(appId)}`,
    ` * The tag configuration for ${appId}, edited in the MediaJel Integrations Assistant. It merges`,
    " * into whatever this file and the domain file set in window.overrides, for this tag alone, and it",
    " * never throws. Change it in the assistant; to undo it, delete this block, markers included.",
    " */",
    `${BODY}(${literal(appId)}, ${literal(sorted(edits))}, ${literal(versionOf(appId, edits))});`,
    endOf(appId),
  ].join("\n");

const indicesOf = (content: string, needle: string): number[] => {
  const found: number[] = [];
  for (let at = content.indexOf(needle); at !== -1; at = content.indexOf(needle, at + needle.length)) found.push(at);
  return found;
};

/** Where one tag's block sits in a file: from its leading semicolon through its end marker's line. */
interface Region {
  start: number;
  end: number;
}

const refuse = (appId: string): ApiError =>
  new ApiError(
    409,
    "overrides_markers",
    `The assistant's block for ${appId} in this file was edited by hand: its begin and end markers no longer pair up. Fix it in the repo first.`,
  );

/** The block's region, null when the file has none, and a refusal when its markers do not pair up. */
export const regionOf = (content: string, appId: string): Region | null => {
  const begins = indicesOf(content, beginOf(appId));
  const ends = indicesOf(content, endOf(appId));
  if (begins.length === 0 && ends.length === 0) return null;
  if (begins.length !== 1 || ends.length !== 1 || ends[0] < begins[0]) throw refuse(appId);
  const start = content[begins[0] - 1] === ";" ? begins[0] - 1 : begins[0];
  const closed = ends[0] + endOf(appId).length;
  return { start, end: content[closed] === "\n" ? closed + 1 : closed };
};

/** A new block after a file's own code, a line apart from it; the file's bytes stay as they were. */
const appended = (content: string, block: string): string => {
  if (content === "") return `${block}\n`;
  return `${content}${content.endsWith("\n") ? "\n" : "\n\n"}${block}\n`;
};

/** A block taken out, and the blank line that set it apart with it. */
const removed = (content: string, region: Region): string => {
  const start = content.slice(region.start - 2, region.start) === "\n\n" ? region.start - 1 : region.start;
  return content.slice(0, start) + content.slice(region.end);
};

const replaced = (content: string, region: Region, block: string): string => {
  const newline = content[region.end - 1] === "\n" ? "\n" : "";
  return content.slice(0, region.start) + block + newline + content.slice(region.end);
};

const withRegion = (content: string, region: Region, block: string | null): string =>
  block === null ? removed(content, region) : replaced(content, region, block);

/**
 * The file with this tag's block in it: the existing block replaced, or a new one appended below the
 * file's own code — or, with no block, taken out again. Nothing outside the region moves.
 */
export const splice = (existing: string | null, appId: string, block: string | null): string => {
  const content = existing ?? "";
  const region = regionOf(content, appId);
  if (region) return withRegion(content, region, block);
  return block === null ? content : appended(content, block);
};

const BEGIN_ANY = new RegExp(`/\\* ${MARK} ([A-Za-z0-9._-]+) begin`, "g");

/** Every tag a file holds a block for, in the order they appear. */
export const blockAppIds = (content: string): string[] => Array.from(content.matchAll(BEGIN_ANY), (match) => match[1]);

/** Each block a file holds, with the tag it is for. */
const blocksIn = (content: string): { appId: string; text: string }[] =>
  blockAppIds(content).map((appId) => {
    const region = regionOf(content, appId) as Region;
    return { appId, text: content.slice(region.start, region.end).replace(/\n$/, "") };
  });

/** The file with every assistant block taken out — what a rule about the file's own code reads. */
export const withoutBlocks = (content: string): string =>
  blockAppIds(content).reduce((rest, appId) => splice(rest, appId, null), content);

/**
 * A whole new file that replaces an old one keeps the blocks the old one carried, so a deploy from
 * the Tracking setup never quietly drops a tag's deployed configuration.
 */
export const carryBlocks = (previous: string | null, next: string): string => {
  const present = new Set(blockAppIds(next));
  return blocksIn(previous ?? "")
    .filter((block) => !present.has(block.appId))
    .reduce((file, block) => appended(file.replace(/\n$/, ""), block.text), next);
};

const CALL = /\}\)\(("(?:[^"\\]|\\.)*"), (\{.*\}), ("v-[0-9a-f]{8}")\);\n/;

/** The edits a file's block for this tag carries now, or null when it has none — what the editor starts from. */
export const editsIn = (content: string | null, appId: string): Record<string, string> | null => {
  const region = content === null ? null : regionOf(content, appId);
  const call = region && (content as string).slice(region.start, region.end).match(CALL);
  if (!call) return null;
  try {
    return JSON.parse(call[2]) as Record<string, string>;
  } catch {
    return null;
  }
};

/** What an edit does to a file: the block it renders (none, to take the tag's block out) and the file after. */
export const planOverrides = (
  existing: string | null,
  appId: string,
  edits: Record<string, string>,
): { block: string | null; after: string } => {
  const block = Object.keys(edits).length > 0 ? renderBlock(appId, edits) : null;
  return { block, after: splice(existing, appId, block) };
};
