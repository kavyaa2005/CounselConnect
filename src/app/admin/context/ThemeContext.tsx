import { createContext, useContext, useState, ReactNode } from "react";

interface ThemeCtx {
  isDark: boolean;
  toggle: () => void;
  t: ReturnType<typeof makeTheme>;
}

function makeTheme(isDark: boolean) {
  return {
    isDark,
    bg:       isDark ? "#0D1117" : "#F4F6F9",
    card:     isDark ? "#161B27" : "#FFFFFF",
    card2:    isDark ? "#1E2538" : "#F7F9FB",
    border:   isDark ? "rgba(255,255,255,0.07)" : "#F0F2F5",
    border2:  isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB",
    text:     isDark ? "#E2E8F0" : "#1F2937",
    textSec:  isDark ? "#94A3B8" : "#6B7280",
    muted:    isDark ? "#475569" : "#9CA3AF",
    sidebar:  isDark ? "#0F1320" : "#FFFFFF",
    nav:      isDark ? "#161B27" : "#FFFFFF",
    input:    isDark ? "#1E2538" : "#F7F9FB",
    inputBorder: isDark ? "rgba(255,255,255,0.10)" : "#E5E7EB",
    hover:    isDark ? "rgba(255,255,255,0.04)" : "#F7F9FB",
    divider:  isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
    shadow:   isDark ? "0 2px 12px rgba(0,0,0,0.4)" : "0 2px 12px rgba(0,0,0,0.04)",
    shadowHov:isDark ? "0 16px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.10)",
    primary:  "#5E8B7E",
    primaryD: "#2D6A4F",
    accent:   "#D8A48F",
  };
}

const ThemeContext = createContext<ThemeCtx>({
  isDark: false,
  toggle: () => {},
  t: makeTheme(false),
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const toggle = () => setIsDark(d => !d);
  const t = makeTheme(isDark);
  return (
    <ThemeContext.Provider value={{ isDark, toggle, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
