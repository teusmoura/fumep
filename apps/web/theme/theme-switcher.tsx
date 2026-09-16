"use client";
import { useTheme } from "./theme-context";

export function ThemeSwitcher() {
  const { toggleAppearance } = useTheme();
  // Stable label during SYSTEM SSR: the server cannot know the device's media query.
  return (
    <button className="theme-switcher" type="button" onClick={toggleAppearance}>
      Alternar tema claro/escuro
    </button>
  );
}
