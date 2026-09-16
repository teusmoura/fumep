import { Message } from "@fumep/ui";
import type { HealthResponse } from "@fumep/validation";
import { loadPublicTheme } from "../theme/load-public-theme";
import { ThemeProvider } from "../theme/theme-context";
import { InstitutionProvider } from "./institution-context";
import { resolveInstitution } from "./institution-route";

export async function renderInstitutionHome(pathname: string) {
  const institution = resolveInstitution(pathname);
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
      <h1>Portal {institution.name}</h1>
      <Message>Projeto institucional em construção.</Message>
    </main>
  );
  return (
    <InstitutionProvider institution={institution}>
      {theme ? <ThemeProvider theme={theme}>{content}</ThemeProvider> : content}
    </InstitutionProvider>
  );
}
