import type { HealthResponse } from "@fumep/validation";

export default function HomePage() {
  const initialHealth = { status: "ok" } satisfies HealthResponse;

  return (
    <main data-api-status={initialHealth.status} id="main-content">
      <h1>Portal FUMEP</h1>
      <p>Projeto institucional em construção.</p>
    </main>
  );
}
