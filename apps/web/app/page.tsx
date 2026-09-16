import { Message } from "@fumep/ui";
import type { HealthResponse } from "@fumep/validation";
import { loadPublicTheme } from "../theme/load-public-theme";
import { ThemeProvider } from "../theme/theme-context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialHealth = { status: "ok" } satisfies HealthResponse;

  let theme;
  try {
    theme = await loadPublicTheme("fumep");
  } catch {
    /* Neutral construction page stays available without exposing internal errors. */
  }
  const content = (
    <main data-api-status={initialHealth.status} id="main-content">
      <h1>Portal FUMEP</h1>
      <Message>Projeto institucional em construção.</Message>
    </main>
  );
  return theme ? <ThemeProvider theme={theme}>{content}</ThemeProvider> : content;
}
