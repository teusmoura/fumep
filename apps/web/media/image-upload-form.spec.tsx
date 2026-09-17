import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ImageUploadForm } from "./image-upload-form";
describe("ImageUploadForm", () => {
  it("renders distinct PDF labels, signature hint and 30 MB limit alongside image controls", () => {
    const html = renderToStaticMarkup(
      <>
        <ImageUploadForm csrfToken="" isAdmin categories={[]} />
        <ImageUploadForm csrfToken="" isAdmin categories={[]} kind="pdf" />
      </>,
    );
    expect(html).toContain('for="upload-pdf"');
    expect(html).toContain('for="pdf-upload-category"');
    expect(html).toContain('aria-describedby="pdf-help"');
    expect(html).toContain('accept=".pdf,application/pdf"');
    expect(html).toContain("PDF até 30 MB");
    expect((html.match(/id="upload-category"/g) ?? []).length).toBe(1);
  });
  it("renders labeled controls and status without internal storage or credentials", () => {
    const html = renderToStaticMarkup(
      <ImageUploadForm
        csrfToken={"a".repeat(43)}
        isAdmin={false}
        categories={[
          {
            id: crypto.randomUUID(),
            name: "Laboratórios ETMSL",
            institutionId: crypto.randomUUID(),
          },
        ]}
      />,
    );
    expect(html).toContain('for="upload-image"');
    expect(html).toContain('for="upload-category"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Laboratórios ETMSL");
    expect(html).not.toContain("minio");
    expect(html).not.toContain("a".repeat(43));
  });
  it("blocks EDITOR without category and preserves global ADMIN option", () => {
    const editor = renderToStaticMarkup(
      <ImageUploadForm csrfToken="" isAdmin={false} categories={[]} />,
    );
    expect(editor).toContain("Não há categoria");
    expect(editor).toContain('disabled=""');
    const admin = renderToStaticMarkup(<ImageUploadForm csrfToken="" isAdmin categories={[]} />);
    expect(admin).toContain("Global / sem categoria");
    expect(admin).not.toContain('disabled=""');
  });
});
