import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Mode = "light" | "dark";
export type Accent = "cobalt" | "aurora" | "sunset" | "grape" | "graphite";

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "cobalt", label: "Cobalt", swatch: "linear-gradient(135deg,#0a84ff,#5856e0)" },
  { id: "aurora", label: "Aurora", swatch: "linear-gradient(135deg,#30d158,#0a84ff)" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg,#ff6348,#ff9f0a)" },
  { id: "grape", label: "Grape", swatch: "linear-gradient(135deg,#bf5af2,#5e5ce6)" },
  { id: "graphite", label: "Graphite", swatch: "linear-gradient(135deg,#9898a0,#6e6e78)" },
];

interface ThemeCtx {
  mode: Mode;
  accent: Accent;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  setAccent: (a: Accent) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export const useTheme = (): ThemeCtx => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
};

const read = (): { mode?: Mode; accent?: Accent } => {
  try {
    return JSON.parse(localStorage.getItem("mj-theme") || "{}");
  } catch {
    return {};
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const init = read();
  const [mode, setModeS] = useState<Mode>(
    init.mode || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  );
  const [accent, setAccentS] = useState<Accent>(init.accent || "cobalt");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    if (accent === "cobalt") root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", accent);
    try {
      localStorage.setItem("mj-theme", JSON.stringify({ mode, accent }));
    } catch {
      /* ignore */
    }
  }, [mode, accent]);

  const setMode = useCallback((m: Mode) => setModeS(m), []);
  const toggleMode = useCallback(() => setModeS((m) => (m === "dark" ? "light" : "dark")), []);
  const setAccent = useCallback((a: Accent) => setAccentS(a), []);

  return (
    <Ctx.Provider value={{ mode, accent, setMode, toggleMode, setAccent }}>{children}</Ctx.Provider>
  );
}
