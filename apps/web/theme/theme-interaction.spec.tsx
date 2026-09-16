// @vitest-environment jsdom
import { act } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme-context";
import { ThemeSwitcher } from "./theme-switcher";
import { appearanceCookieName } from "./appearance";
import type { PublicInstitutionTheme } from "@fumep/validation";

let root: Root | undefined;
let container: HTMLDivElement;
let systemDark: boolean;
const listeners = new Set<() => void>();
const theme: PublicInstitutionTheme = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "fumep",
  primary: "#123456",
  primaryForeground: "#ffffff",
  accent: "#000000",
  accentForeground: "#ffffff",
  appearanceDefault: "SYSTEM",
};
function Probe() {
  const { mode } = useTheme();
  return <output>{mode}</output>;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  systemDark = false;
  listeners.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return systemDark;
      },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    })),
  );
  container = document.createElement("div");
  document.body.append(container);
  document.cookie = `${appearanceCookieName}=; Path=/; Max-Age=0`;
});
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  root = undefined;
  container.remove();
  vi.unstubAllGlobals();
});
describe("visitor theme interaction", () => {
  it.each(["fumep", "etmsl", "cramam"])(
    "toggles and persists only visual preference for %s, retaining focus and overriding later system changes",
    async (slug) => {
      root = createRoot(container);
      await act(() =>
        root!.render(
          <ThemeProvider theme={{ ...theme, slug }}>
            <Probe />
            <ThemeSwitcher />
          </ThemeProvider>,
        ),
      );
      const button = container.querySelector("button")!;
      expect(button.type).toBe("button");
      expect(button.textContent).toContain("Alternar tema claro/escuro");
      button.focus();
      await act(() => button.click());
      expect(container.querySelector("output")!.textContent).toBe("DARK");
      expect(container.querySelector(".institution-theme")!.getAttribute("data-appearance")).toBe(
        "DARK",
      );
      expect(document.cookie).toBe(`${appearanceCookieName}=DARK`);
      expect(document.activeElement).toBe(button);
      await act(() => {
        systemDark = true;
        listeners.forEach((listener) => listener());
      });
      await act(() => button.click());
      expect(container.querySelector("output")!.textContent).toBe("LIGHT");
      expect(document.cookie).toBe(`${appearanceCookieName}=LIGHT`);
      expect(document.activeElement).toBe(button);
    },
  );
  it("updates SYSTEM on device changes but keeps explicit ADMIN appearance", async () => {
    root = createRoot(container);
    await act(() =>
      root!.render(
        <ThemeProvider theme={theme}>
          <Probe />
        </ThemeProvider>,
      ),
    );
    await act(() => {
      systemDark = true;
      listeners.forEach((listener) => listener());
    });
    expect(container.querySelector("output")!.textContent).toBe("DARK");
    await act(() =>
      root!.render(
        <ThemeProvider theme={{ ...theme, appearanceDefault: "LIGHT" }}>
          <Probe />
        </ThemeProvider>,
      ),
    );
    expect(container.querySelector("output")!.textContent).toBe("LIGHT");
  });
  it("hydrates a persisted manual theme without mismatching SSR or reverting to ADMIN", async () => {
    const element = (
      <ThemeProvider
        theme={{ ...theme, appearanceDefault: "LIGHT" }}
        initialManualAppearance="DARK"
      >
        <Probe />
        <ThemeSwitcher />
      </ThemeProvider>
    );
    container.innerHTML = renderToString(element);
    expect(container.innerHTML).toContain('data-appearance="DARK"');
    const onRecoverableError = vi.fn();
    await act(() => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("output")!.textContent).toBe("DARK");
  });
});
