import { cookies } from "next/headers";
import { loadCategoryContext } from "../../../../media/category-context";
import { MediaCategoryManager } from "../../../../media/category-manager";
import Link from "next/link";
export default async function CategoriesPage() {
  const cookie = (await cookies()).get("fumep_session");
  const context = cookie ? await loadCategoryContext(`fumep_session=${cookie.value}`) : undefined;
  return (
    <main id="main-content" className="media-upload-page">
      <h1>Categorias de mídia</h1>
      <Link href="/admin/media">Enviar arquivos</Link>
      {context ? (
        <MediaCategoryManager {...context} />
      ) : (
        <p>Entre com uma sessão administrativa válida. Se já entrou, tente novamente.</p>
      )}
    </main>
  );
}
