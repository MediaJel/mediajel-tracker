import { TriedEdit } from "@mediajel/assistant-core/simulation";

import type { OverridesPreview } from "~/service/client";

/**
 * What deploying a tried edit does, and what the slip says about an edit being tried — decided
 * without a panel.
 */

/** The file's own code, by its lines: what a deploy keeps as it is. */
const linesOf = (code: string): number => (code.trim() === "" ? 0 : code.trimEnd().split("\n").length);

const lines = (count: number): string => `${count} ${count === 1 ? "line" : "lines"}`;

/** What committing the edit does to the tag's app-id file, in one sentence. */
export const deployLine = (preview: OverridesPreview): string => {
  if (!preview.exists) return "Creates the file, holding only the edit.";
  if (preview.block === null) return "Takes the edit deployed before out of the file; its own code stays as it is.";
  if (preview.deployed) return "Replaces the edit deployed before; the file’s own code stays as it is.";
  return `Adds the edit below the file’s ${lines(linesOf(preview.before))} of its own code, which stay as they are.`;
};

/** Every param the edit sets is a change from the tag's own configuration — more than the last Try sent, when it built on an earlier edit. */
const changes = (count: number): string => `${count} ${count === 1 ? "change" : "changes"}`;

/** What the slip says, beside its trigger, about the edit being tried for the tag — or nothing. */
export const triedLine = (tried: TriedEdit | undefined): string => {
  if (!tried) return "";
  if (tried.deployed) return "edit deployed · the page runs it until the tag’s CDN serves it";
  const count = Object.keys(tried.edits).length;
  return count === 0 ? "trying the file without the edit deployed before" : `${changes(count)} tried on this page`;
};
