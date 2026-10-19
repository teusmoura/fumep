import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("galeria real aparece em página pública anônima e acompanha edição", async ({ page }) => {
  const email = process.env.MIG6_E2E_EMAIL;
  const password = process.env.MIG6_E2E_PASSWORD;
  test.skip(!email || !password, "Conta local descartável requerida");
  const marker = Date.now().toString(36);
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
  await page.getByLabel("Nome", { exact: true }).fill(`Feed media ${marker}`);
  await page.getByLabel("Slug", { exact: true }).fill(`feed-media-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  for (let index = 1; index <= 2; index++) {
    await page.getByLabel("Imagem JPEG, PNG, WebP, AVIF ou PDF").setInputFiles({
      name: `feed-${marker}-${index}.png`,
      mimeType: "image/png",
      buffer: png,
    });
    await page.getByLabel("Texto alternativo padrão para imagens").fill(`Foto pública ${index}`);
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
  }

  await page.goto("/admin/editorial");
  await page.getByLabel("Instituição da galeria").selectOption({ label: "FUMEP" });
  await page.getByLabel("Título da galeria").fill(`Feed galeria ${marker}`);
  await page.getByRole("button", { name: "Criar galeria" }).click();
  await page.getByRole("button", { name: `Abrir galeria Feed galeria ${marker}` }).click();
  for (let index = 1; index <= 2; index++) {
    await page
      .getByLabel("Imagem", { exact: true })
      .selectOption({ label: `feed-${marker}-${index}.png` });
    await page
      .getByLabel("Texto alternativo")
      .fill(index === 1 ? "Primeira descrição" : "Segunda descrição");
    await page.getByRole("button", { name: "Adicionar imagem" }).click();
    await expect(page.getByRole("status")).toContainText("Item salvo");
  }
  await page.getByRole("button", { name: "Mover Segunda descrição para cima" }).click();
  await expect(page.getByRole("status")).toContainText("Ordem da galeria salva");

  await page.goto("/admin/pages");
  await page.getByLabel("Instituição").selectOption({ label: "FUMEP" });
  await page.getByLabel("Nome do modelo").fill(`Modelo feed ${marker}`);
  await page.getByRole("button", { name: "Salvar modelo" }).click();
  await page.getByLabel("Título da página").fill(`Página feed ${marker}`);
  await page.getByLabel("Endereço (slug)").fill(`feed-${marker}`);
  await page.getByRole("button", { name: "Aplicar modelo e criar rascunho" }).click();
  await expect(page.getByRole("heading", { name: "Editar rascunho" })).toBeVisible();
  await page
    .getByLabel("Galeria para o novo bloco")
    .selectOption({ label: `Feed galeria ${marker}` });
  await page.getByRole("button", { name: "Adicionar bloco de galeria" }).click();
  const [publishResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/publish")),
    page.getByRole("button", { name: "Salvar e publicar" }).click(),
  ]);
  expect(publishResponse.status(), await publishResponse.text()).toBe(200);
  await expect(page.getByText(/Publicação experimental concluída/)).toBeVisible();

  const publicPath = `/paginas/fumep/feed-${marker}`;
  await page.goto(publicPath);
  await expect(page.getByRole("img", { name: "Primeira descrição" })).toBeVisible();
  await expect(
    page.locator(".builder-feed-list li").first().getByRole("img", { name: "Segunda descrição" }),
  ).toBeVisible();
  await page.goto("/admin/editorial");
  await page.getByRole("button", { name: `Abrir galeria Feed galeria ${marker}` }).click();
  await page.getByRole("button", { name: "Editar item Primeira descrição" }).click();
  await page.getByLabel("Texto alternativo").fill("Descrição atualizada após publicar");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page.getByRole("status")).toContainText("Item salvo");
  await page.context().clearCookies();
  await page.goto(publicPath);
  await expect(page.getByRole("heading", { name: `Página feed ${marker}` })).toBeVisible();
  const image = page.getByRole("img", { name: "Descrição atualizada após publicar" });
  await expect(image).toBeVisible();
  await expect(
    page.locator(".builder-feed-list li").first().getByRole("img", { name: "Segunda descrição" }),
  ).toBeVisible();
  await expect
    .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await expect(page.getByText("Conteúdo de demonstração", { exact: false })).toHaveCount(0);
});
