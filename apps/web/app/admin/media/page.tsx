import { cookies } from "next/headers";
import { loadUploadContext } from "../../../media/upload-context";
import { ImageUploadForm } from "../../../media/image-upload-form";
export default async function MediaUploadPage() {
  const cookie = (await cookies()).get("fumep_session");
  const context = cookie ? await loadUploadContext(`fumep_session=${cookie.value}`) : undefined;
  return (
    <main id="main-content" className="media-upload-page">
      <h1>Enviar imagem</h1>
      {context ? (
        <ImageUploadForm {...context} />
      ) : (
        <p>
          Entre com uma sessão administrativa válida para enviar imagens. Se já entrou, tente
          novamente.
        </p>
      )}
    </main>
  );
}
