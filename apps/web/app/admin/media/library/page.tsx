import { cookies } from "next/headers";
import Link from "next/link";
import { loadMediaLibrary } from "../../../../media/library-context";
import { MediaLibraryResults } from "../../../../media/library-results";
export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookie = (await cookies()).get("fumep_session");
  const context = cookie
    ? await loadMediaLibrary(`fumep_session=${cookie.value}`, await searchParams)
    : undefined;
  return (
    <main id="main-content" className="media-upload-page">
      <h1>Biblioteca de mídia</h1>
      <Link href="/admin/media">Enviar arquivos</Link>
      {context ? (
        <MediaLibraryResults {...context} />
      ) : (
        <p>
          Não foi possível consultar a biblioteca. Verifique sua sessão e os filtros; tente
          novamente.
        </p>
      )}
    </main>
  );
}
