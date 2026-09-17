import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaLibraryResults } from "./library-results";
describe("SSR library search", () => {
  it("renders labels, escaped metadata and pagination preserving filters", () => {
    const categoryId = crypto.randomUUID();
    const html = renderToStaticMarkup(
      <MediaLibraryResults
        query={{ q: "laboratório & teste", categoryId, page: 2, limit: 1 }}
        categories={[{ id: categoryId, name: "ETMSL", institutionId: crypto.randomUUID() }]}
        result={{
          page: 2,
          limit: 1,
          total: 3,
          items: [
            {
              id: crypto.randomUUID(),
              originalFilename: "<script>unsafe</script>.pdf",
              mimeType: "application/pdf",
              sizeBytes: 100,
              categoryId,
              processingStatus: "READY",
              type: "DOCUMENT",
              categoryName: "ETMSL",
              altText: null,
              caption: "Matriz curricular",
              width: null,
              height: null,
              createdAt: new Date().toISOString(),
            },
          ],
        }}
      />,
    );
    expect(html).toContain('for="media-search"');
    expect(html).toContain('for="media-search-category"');
    expect(html).toContain('method="get"');
    expect(html).toContain('aria-label="Paginação da biblioteca"');
    expect(html).toContain("Página anterior");
    expect(html).toContain("Próxima página");
    expect(html).toContain(`categoryId=${categoryId}`);
    expect(html).toContain("page=1");
    expect(html).toContain("page=3");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("minio");
  });
  it("renders empty state without a next page", () => {
    const html = renderToStaticMarkup(
      <MediaLibraryResults
        query={{ page: 1, limit: 20 }}
        categories={[]}
        result={{ page: 1, limit: 20, total: 0, items: [] }}
      />,
    );
    expect(html).toContain("Nenhum arquivo");
    expect(html).not.toContain("Próxima página");
  });
});
