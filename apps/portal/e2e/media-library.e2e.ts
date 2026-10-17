import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("biblioteca mostra login acessível", async ({ page }) => {
  await page.goto("/admin/media");
  await expect(page.getByRole("heading", { name: "Biblioteca de Mídia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a"])
    .analyze();
  expect(report.violations).toEqual([]);
});

test("perfis locais alternam entre ADMIN e EDITOR com escopo real", async ({ page }) => {
  test.skip(process.env.FUMEP_LOCAL_DEMO_LOGIN !== "1", "Demo login local desabilitado");
  await page.goto("/admin/media");
  await page.getByRole("button", { name: "Entrar como Editor ETMSL" }).click();
  await expect(page.getByText("Perfil ativo: EDITOR")).toBeVisible();
  await expect(page.locator("#media-institution option")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: /Recuperar exclusão falha/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Entrar como Administrador" }).click();
  await expect(page.getByText("Perfil ativo: ADMIN")).toBeVisible();
  await expect.poll(() => page.locator("#media-institution option").count()).toBeGreaterThan(1);
  await expect(page.getByRole("heading", { name: /Recuperar exclusão falha/ })).toBeVisible();
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a"])
    .analyze();
  expect(report.violations).toEqual([]);
});

test("ADMIN usa PDF e imagem processada na biblioteca", async ({ page }) => {
  const email = process.env.MIG6_E2E_EMAIL;
  const password = process.env.MIG6_E2E_PASSWORD;
  test.skip(!email || !password, "Credenciais locais descartáveis requeridas");
  const marker = Date.now().toString(36);
  const filename = `media-e2e-${marker}.pdf`;
  await page.goto("/admin/media");
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Nova categoria" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill(`Mídia E2E ${marker}`);
  await page.getByLabel("Slug").fill(`midia-e2e-${marker}`);
  await page.getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByRole("status")).toContainText("Categoria salva");
  await page.getByLabel("Imagem JPEG, PNG, WebP, AVIF ou PDF").setInputFiles({
    name: filename,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\n%%EOF"),
  });
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("PDF salvo");
  await expect(page.getByRole("heading", { name: "Arquivo selecionado" })).toBeVisible();
  await expect(page.locator("iframe.media-document-preview")).toHaveAttribute("src", /\/content$/);
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a"])
    .analyze();
  expect(report.violations).toEqual([]);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir arquivo" }).click();
  await expect(page.getByRole("status")).toContainText("Exclusão solicitada");
  await expect(page.getByRole("button", { name: filename })).toHaveCount(0);

  const imageName = `media-e2e-${marker}.png`;
  await page.getByLabel("Imagem JPEG, PNG, WebP, AVIF ou PDF").setInputFiles({
    name: imageName,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAIAAABChommAAAAFUlEQVR4nGPUiNrCQAgwEVQx7BUBAG3vAUanrLiUAAAAAElFTkSuQmCC",
      "base64",
    ),
  });
  await page.getByLabel("Texto alternativo padrão para imagens").fill("Imagem de teste");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Imagem recebida");
  await expect
    .poll(
      async () => {
        await page.getByRole("button", { name: "Buscar" }).click();
        return page.locator('section[aria-labelledby="selected-title"]').textContent();
      },
      { timeout: 20_000 },
    )
    .toContain("READY");
  await expect(page.getByRole("img", { name: "Imagem de teste" })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="selected-title"]')).toContainText("WEBP");
  await expect(page.locator('section[aria-labelledby="selected-title"]')).toContainText("AVIF");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir arquivo" }).click();
  await expect(page.getByRole("status")).toContainText("Exclusão solicitada");
});
