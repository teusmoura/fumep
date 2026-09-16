"use client";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { PublicInstitutionTheme } from "@fumep/validation";

const ThemeContext = createContext<
  { theme: PublicInstitutionTheme; mode: "LIGHT" | "DARK" } | undefined
>(undefined);
function subscribe(callback: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const snapshot = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
export function ThemeProvider({
  theme,
  children,
}: {
  theme: PublicInstitutionTheme;
  children: ReactNode;
}) {
  const systemDark = useSyncExternalStore(subscribe, snapshot, () => false);
  const mode =
    theme.appearanceDefault === "SYSTEM"
      ? systemDark
        ? "DARK"
        : "LIGHT"
      : theme.appearanceDefault;
  const style = {
    "--color-primary": theme.primary,
    "--color-primary-foreground": theme.primaryForeground,
    "--color-accent": theme.accent,
    "--color-accent-foreground": theme.accentForeground,
  } as CSSProperties;
  return (
    <ThemeContext.Provider value={{ theme, mode }}>
      <div
        className="institution-theme"
        data-institution={theme.slug}
        data-appearance={theme.appearanceDefault}
        style={style}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
