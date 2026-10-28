import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("notícia criada no painel aparece no SSR público anônimo", async ({ page }) => {
  const email = process.env.MIG6_E2E_EMAIL;
  const password = process.env.MIG6_E2E_PASSWORD;
  test.skip(!email || !password, "Conta descartável do banco local necessária");
  const marker = Date.now().toString(36);
  const title = `Notícia visível ${marker}`;
  const slug = `noticia-visivel-${marker}`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAIAAABChommAAAAFUlEQVR4nGPUiNrCQAgwEVQx7BUBAG3vAUanrLiUAAAAAElFTkSuQmCC",
    "base64",
  );

  await page.goto("/admin/media");
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha").fill(password!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nova categoria" })).toBeVisible();
  await page.getByLabel("Instituição").selectOption({ label: "FUMEP" });
  await page.getByLabel("Nome", { exact: true }).fill(`Capa ${marker}`);
  await page.getByLabel("Slug", { exact: true }).fill(`capa-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await page.getByLabel("Imagem JPEG, PNG, WebP, AVIF ou PDF").setInputFiles({
    name: `capa-${marker}.png`,
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByLabel("Texto alternativo padrão para imagens").fill("Equipe da FUMEP");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Imagem recebida");
  await expect
    .poll(
      async () => {
        await page.getByRole("button", { name: "Buscar", exact: true }).click();
        return page.locator('section[aria-labelledby="selected-title"]').textContent();
      },
      { timeout: 20_000 },
    )
    .toContain("READY");

  await page.goto("/admin/editorial");
  await page.getByLabel("Instituição", { exact: true }).selectOption({ label: "FUMEP" });
  await page.getByLabel("Nome da categoria").fill(`Editorial ${marker}`);
  await page.getByLabel("Slug da categoria").fill(`editorial-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByRole("status")).toContainText("Categoria salva");

  await page.goto("/admin/noticias");
  await expect(page.getByRole("heading", { name: "Nova notícia" })).toBeVisible();
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Endereço (slug)").fill(slug);
  await page.getByLabel("Resumo").fill("Resumo público da notícia.");
  await page.getByRole("checkbox", { name: "FUMEP" }).check();
  await page.getByLabel("Categoria editorial").selectOption({ label: `Editorial ${marker}` });
  await page.getByLabel("Imagem de capa READY").selectOption({ label: `capa-${marker}.png` });
  await page.getByLabel("Texto alternativo da capa").fill("Equipe da FUMEP");
  await page.getByLabel("Título do bloco 1").fill("Comunicado");
  await page.getByLabel("Texto do bloco 1").fill("Conteúdo persistido e publicado.");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByRole("status")).toContainText("Rascunho salvo");
  await page.getByRole("button", { name: "Publicar notícia salva" }).click();
  await expect(page.getByRole("status")).toContainText("Notícia publicada");

  await page.context().clearCookies();
  const response = await page.goto(`/noticias/fumep/${slug}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Conteúdo persistido e publicado.")).toBeVisible();
  const image = page.getByRole("img", { name: "Equipe da FUMEP" });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.goto("/noticias/fumep");
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
});
