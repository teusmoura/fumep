import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("notícia publicada aparece no NEWS_FEED de uma página anônima", async ({ page }) => {
  const email = process.env.MIG6_E2E_EMAIL;
  const password = process.env.MIG6_E2E_PASSWORD;
  test.skip(!email || !password, "Conta descartável do banco local necessária");
  const marker = Date.now().toString(36);
  const title = `Feed notícia ${marker}`;
  const newsSlug = `feed-noticia-${marker}`;
  const pageSlug = `feed-pagina-${marker}`;
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
  await page.getByLabel("Nome", { exact: true }).fill(`Feed capa ${marker}`);
  await page.getByLabel("Slug", { exact: true }).fill(`feed-capa-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await page.getByLabel("Imagem JPEG, PNG, WebP, AVIF ou PDF").setInputFiles({
    name: `feed-capa-${marker}.png`,
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByLabel("Texto alternativo padrão para imagens").fill("Capa do feed");
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
  await page.getByRole("button", { name: "Recarregar dados editoriais" }).click();
  await page.getByLabel("Instituição", { exact: true }).selectOption({ label: "FUMEP" });
  await page.getByLabel("Nome da categoria").fill(`Feed editorial ${marker}`);
  await page.getByLabel("Slug da categoria").fill(`feed-editorial-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByRole("status")).toContainText("Categoria salva");

  await page.goto("/admin/noticias");
  await page.getByRole("button", { name: "Recarregar notícias" }).click();
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Endereço (slug)").fill(newsSlug);
  await page.getByLabel("Resumo").fill("Resumo dinâmico do feed.");
  await page.getByRole("checkbox", { name: "FUMEP" }).check();
  await page.getByLabel("Categoria editorial").selectOption({ label: `Feed editorial ${marker}` });
  await page.getByLabel("Imagem de capa READY").selectOption({ label: `feed-capa-${marker}.png` });
  await page.getByLabel("Texto alternativo da capa").fill("Capa do feed");
  await page.getByLabel("Título do bloco 1").fill("Corpo");
  await page.getByLabel("Texto do bloco 1").fill("Conteúdo da notícia.");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByRole("status")).toContainText("Rascunho salvo");
  await page.getByRole("button", { name: "Publicar notícia salva" }).click();
  await expect(page.getByRole("status")).toContainText("Notícia publicada");

  await page.goto("/admin/pages");
  await page.getByLabel("Instituição").selectOption({ label: "FUMEP" });
  await page.getByLabel("Nome do modelo").fill(`Modelo feed ${marker}`);
  await page.getByRole("button", { name: "Salvar modelo" }).click();
  await page.getByLabel("Título da página").fill(`Página feed ${marker}`);
  await page.getByLabel("Endereço (slug)").fill(pageSlug);
  await page.getByRole("button", { name: "Aplicar modelo e criar rascunho" }).click();
  await expect(page.getByRole("heading", { name: "Editar rascunho" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar bloco de notícias" }).click();
  await page
    .getByRole("group", { name: "Instituições do feed" })
    .getByRole("checkbox", { name: "FUMEP" })
    .check();
  await page
    .getByRole("group", { name: "Categorias do feed" })
    .getByRole("checkbox", { name: `Feed editorial ${marker}` })
    .check();
  await page.getByLabel("Limite de notícias").fill("3");
  await page.getByRole("button", { name: "Salvar e publicar" }).click();
  await expect(page.getByRole("status")).toContainText("Publicação experimental concluída");

  await page.context().clearCookies();
  const response = await page.goto(`/paginas/fumep/${pageSlug}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: `Página feed ${marker}` })).toBeVisible();
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(page.getByText("Resumo dinâmico do feed.")).toBeVisible();
  const image = page.getByRole("img", { name: "Capa do feed" });
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/noticias/fumep/${newsSlug}$`));
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.goBack();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
