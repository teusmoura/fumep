import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("categorias e galeria persistem, ordenam imagens READY e projetam GALLERY_FEED", async ({
  page,
}) => {
  const email = process.env.MIG6_E2E_EMAIL;
  const password = process.env.MIG6_E2E_PASSWORD;
  test.skip(!email || !password, "Credenciais locais descartáveis requeridas");
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
  await page.getByLabel("Nome", { exact: true }).fill(`Mídia Editorial ${marker}`);
  await page.getByLabel("Slug", { exact: true }).fill(`midia-editorial-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();

  for (let index = 1; index <= 2; index++) {
    const filename = `editorial-${marker}-${index}.png`;
    await page.getByLabel("Imagem JPEG, PNG, WebP, AVIF ou PDF").setInputFiles({
      name: filename,
      mimeType: "image/png",
      buffer: png,
    });
    await page.getByLabel("Texto alternativo padrão para imagens").fill(`Imagem ${index}`);
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
  await expect(
    page.getByRole("heading", { name: "Categorias editoriais e galerias" }),
  ).toBeVisible();
  await page.getByLabel("Nome da categoria").fill(`Categoria ${marker}`);
  await page.getByLabel("Slug da categoria").fill(`categoria-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByRole("status")).toContainText("Categoria salva");
  await page.getByRole("button", { name: `Editar categoria Categoria ${marker}` }).click();
  await page.getByLabel("Nome da categoria").fill(`Categoria revista ${marker}`);
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("status")).toContainText("Categoria salva");

  await page.getByLabel("Título da galeria").fill(`Galeria ${marker}`);
  await page.getByRole("button", { name: "Criar galeria" }).click();
  await expect(page.getByRole("status")).toContainText("Galeria criada");
  await page.reload();
  await page.getByRole("button", { name: "Recarregar dados editoriais" }).click();
  await expect(
    page.getByRole("button", { name: `Editar categoria Categoria revista ${marker}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Abrir galeria Galeria ${marker}` }).click();
  await expect(
    page.getByRole("heading", { name: `Gerenciar galeria: Galeria ${marker}` }),
  ).toBeVisible();
  await page.getByLabel("Título", { exact: true }).fill(`Galeria revista ${marker}`);
  await page.getByRole("button", { name: "Salvar galeria" }).click();
  await expect(page.getByRole("status")).toContainText("Galeria atualizada");

  for (let index = 1; index <= 2; index++) {
    await page
      .getByLabel("Imagem", { exact: true })
      .selectOption({ label: `editorial-${marker}-${index}.png` });
    await page.getByLabel("Texto alternativo").fill(`Imagem editorial ${index}`);
    await page.getByRole("button", { name: "Adicionar imagem" }).click();
    await expect(page.getByRole("status")).toContainText("Item salvo");
  }
  await expect(page.getByRole("heading", { name: "Prévia GALLERY_FEED" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Imagem editorial 1" })).toBeVisible();
  await page.getByRole("button", { name: "Mover Imagem editorial 2 para cima" }).click();
  await expect(page.getByRole("status")).toContainText("Ordem da galeria salva");
  await expect(
    page
      .locator('section[aria-labelledby="selected-gallery-title"] ol')
      .first()
      .locator("li")
      .first(),
  ).toContainText("Imagem editorial 2");
  await expect(
    page
      .locator('section[aria-labelledby="selected-gallery-title"] ol')
      .last()
      .locator("li")
      .first()
      .getByRole("img", { name: "Imagem editorial 2" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Editar item Imagem editorial 2" }).click();
  await page.getByLabel("Legenda").fill("Legenda revista");
  await page.getByRole("button", { name: "Salvar item" }).click();
  await expect(page.getByText("Legenda revista").first()).toBeVisible();
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a"])
    .analyze();
  expect(report.violations).toEqual([]);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remover item Imagem editorial 1" }).click();
  await expect(page.getByRole("status")).toContainText("Imagem removida");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir galeria" }).click();
  await expect(page.getByRole("status")).toContainText("Galeria excluída");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Excluir categoria Categoria revista ${marker}` }).click();
  await expect(page.getByRole("status")).toContainText("Categoria excluída");
});
