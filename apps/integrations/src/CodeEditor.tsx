import React from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "./theme/ThemeProvider";

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  language: "html" | "javascript";
  readOnly?: boolean;
  placeholder?: string;
}) {
  const { mode } = useTheme();
  return (
    <Editor
      value={value}
      onChange={(v) => onChange(v ?? "")}
      language={language}
      theme={mode === "dark" ? "vs-dark" : "light"}
      options={{
        readOnly,
        placeholder,
        fontSize: 13.5,
        fontFamily: "SF Mono, JetBrains Mono, ui-monospace, Menlo, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 18, bottom: 18 },
        lineNumbersMinChars: 3,
        glyphMargin: false,
        folding: false,
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        tabSize: 2,
        automaticLayout: true,
        overviewRulerLanes: 0,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
        guides: { indentation: false },
      }}
      loading={<div className="p-6 text-sm text-ink-faint">Loading editor…</div>}
    />
  );
}
