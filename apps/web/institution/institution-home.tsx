import { Message } from "@fumep/ui";
import type { HealthResponse } from "@fumep/validation";
import { loadPublicTheme } from "../theme/load-public-theme";
import { ThemeProvider } from "../theme/theme-context";
import { readManualAppearance } from "../theme/read-appearance";
import { ThemeSwitcher } from "../theme/theme-switcher";
import { InstitutionProvider } from "./institution-context";
import { resolveInstitution } from "./institution-route";
import { InstitutionLogo } from "../media/institution-logo";

export async function renderInstitutionHome(pathname: string) {
  const institution = resolveInstitution(pathname);
  const initialManualAppearance = await readManualAppearance();
  const initialHealth = { status: "ok" } satisfies HealthResponse;
  let theme;
  try {
    const loaded = await loadPublicTheme(institution.slug);
    // Defense in depth: never display another institution's tokens.
    if (loaded?.slug === institution.slug) theme = loaded;
  } catch {
    /* Keep the neutral construction page available without exposing internal errors. */
  }
  const content = (
    <main data-api-status={initialHealth.status} id="main-content">
      {theme && (
        <InstitutionLogo theme={theme} name={institution.name} homePath={institution.homePath} />
      )}
      <h1>Portal {institution.name}</h1>
      <Message>Projeto institucional em construção.</Message>
      {theme && <ThemeSwitcher />}
    </main>
  );
  return (
    <InstitutionProvider institution={institution}>
      {theme ? (
        <ThemeProvider theme={theme} initialManualAppearance={initialManualAppearance}>
          {content}
        </ThemeProvider>
      ) : (
        content
      )}
    </InstitutionProvider>
  );
}
