/**
 * Types only. Everything else is imported by its own path (`@mediajel/assistant-core/recorder/recorder`)
 * so the extension's main-world bundle never pulls the prompt's knowledge base in beside the
 * recorder, and the panel never pulls the recorder in beside the UI.
 */
export * from "@mediajel/assistant-core/types";
export type { PageContext } from "@mediajel/assistant-core/context";
