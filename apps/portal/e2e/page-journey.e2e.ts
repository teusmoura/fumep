import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectAccessible(page: Page) {
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(report.violations).toEqual([]);
}

test("login de demonstração é acessível sem credenciais", async ({ page }) => {
  await page.goto("/admin/pages");
  await expect(page.getByRole("heading", { name: "Entrar como administrador" })).toBeVisible();
  await expectAccessible(page);
});

test("ADMIN publica rascunho de texto e abre SSR público", async ({ page }) => {
  const email = process.env.MIG6_E2E_EMAIL;
  const password = process.env.MIG6_E2E_PASSWORD;
  test.skip(
    !email || !password,
    "Defina credenciais locais de demonstração para a jornada integrada",
  );

  const marker = Date.now().toString(36);
  const title = `Página E2E ${marker}`;
  const slug = `pagina-e2e-${marker}`;
  const body = `Conteúdo persistido E2E ${marker}`;

  const [sessionResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/v1/admin/session")),
    page.goto("/admin/pages"),
  ]);
  const apiOrigin = new URL(sessionResponse.url()).origin;
  expect(["localhost", "127.0.0.1"]).toContain(new URL(apiOrigin).hostname);
  const demoProbe = await page.request.get(
    `${apiOrigin}/api/v1/public/institutions/fumep/pages/mig6-e2e-nonexistent`,
  );
  expect(demoProbe.status()).toBe(404);
  expect(await demoProbe.json()).toEqual({ detail: "Published page not found" });
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Sessão iniciada.")).toBeVisible();
  await page.getByLabel("Instituição").selectOption({ label: "FUMEP" });
  await expectAccessible(page);

  await page.getByLabel("Nome do modelo").fill(`Modelo E2E ${marker}`);
  await page.getByRole("button", { name: "Salvar modelo" }).click();
  await expect(page.getByText("Modelo salvo no banco de migração.")).toBeVisible();
  await page.getByLabel("Título da página").fill(title);
  await page.getByLabel("Endereço (slug)").fill(slug);
  await page.getByRole("button", { name: "Aplicar modelo e criar rascunho" }).click();
  await expect(page.getByText("Rascunho criado no PostgreSQL.")).toBeVisible();

  await page.getByLabel("Texto do bloco").fill(body);
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo no PostgreSQL.")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: "Abrir prévia salva" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(body)).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("link", { name: "Voltar ao editor" }).click();
  await expect(page.getByRole("heading", { name: "Editar rascunho" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page.getByText(/Publicação experimental concluída/)).toBeVisible();

  const path = `/paginas/fumep/${slug}`;
  const response = await page.request.get(path);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(body);
  await page.getByRole("link", { name: "Abrir página pública" }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(body)).toBeVisible();
  await expectAccessible(page);
});
