import Link from "next/link";
import { MediaDeleteControl } from "./media-delete-control";
import { MediaDeletionRecovery } from "./media-deletion-recovery";
import type {
  MediaLibraryQuery,
  MediaLibraryResponse,
  MediaCategoryOption,
} from "@fumep/validation";
export function MediaLibraryResults({
  query,
  result,
  categories,
  csrfToken,
  isAdmin,
}: {
  query: MediaLibraryQuery;
  result: MediaLibraryResponse;
  categories: MediaCategoryOption[];
  csrfToken?: string;
  isAdmin?: boolean;
}) {
  const pageUrl = (page: number) => {
    const params = new URLSearchParams({ page: String(page), limit: String(query.limit) });
    if (query.q) params.set("q", query.q);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    return `/admin/media/library?${params}`;
  };
  return (
    <section aria-label="Busca da biblioteca" className="media-category-manager">
      <form action="/admin/media/library" method="get" className="media-upload-form">
        <label htmlFor="media-search">Buscar arquivo</label>
        <input
          id="media-search"
          name="q"
          type="search"
          maxLength={200}
          defaultValue={query.q ?? ""}
          aria-describedby="media-search-help"
        />
        <p id="media-search-help">
          Busque por nome, texto alternativo, legenda ou nome da categoria.
        </p>
        <label htmlFor="media-search-category">Categoria</label>
        <select id="media-search-category" name="categoryId" defaultValue={query.categoryId ?? ""}>
          <option value="">Todas as categorias autorizadas</option>
          {categories.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <button type="submit">Buscar</button>
      </form>
      <p role="status">
        {result.total} arquivo(s) encontrado(s). Página {result.page}.
      </p>
      {!result.items.length && <p>Nenhum arquivo encontrado nesta página.</p>}
      <ul>
        {result.items.map((row) => (
          <li key={row.id}>
            <h2>{row.originalFilename}</h2>
            <p>
              {row.type === "DOCUMENT" ? "PDF" : "Imagem"} — {row.sizeBytes} bytes —{" "}
              {row.categoryName ?? "Sem categoria"} — {row.processingStatus}
            </p>
            <p>Texto alternativo: {row.altText ?? "Não informado"}</p>
            <p>Legenda: {row.caption ?? "Não informada"}</p>
            <p>Referência: {row.id}</p>
            {csrfToken && (
              <MediaDeleteControl id={row.id} name={row.originalFilename} csrfToken={csrfToken} />
            )}
          </li>
        ))}
      </ul>
      <nav aria-label="Paginação da biblioteca">
        {result.page > 1 && <Link href={pageUrl(result.page - 1)}>Página anterior</Link>}
        {result.page < 10000 && result.page * result.limit < result.total && (
          <Link href={pageUrl(result.page + 1)}>Próxima página</Link>
        )}
      </nav>
      {isAdmin && csrfToken && <MediaDeletionRecovery csrfToken={csrfToken} />}
    </section>
  );
}
