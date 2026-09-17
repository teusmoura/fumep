import { cookies } from "next/headers";
import { loadUploadContext } from "../../../media/upload-context";
import { ImageUploadForm } from "../../../media/image-upload-form";
export default async function MediaUploadPage() {
  const cookie = (await cookies()).get("fumep_session");
  const context = cookie ? await loadUploadContext(`fumep_session=${cookie.value}`) : undefined;
  return (
    <main id="main-content" className="media-upload-page">
      <h1>Enviar arquivos</h1>
      {context ? (
        <>
          <h2>Imagem</h2>
          <ImageUploadForm {...context} />
          <h2>Documento PDF</h2>
          <ImageUploadForm {...context} kind="pdf" />
        </>
      ) : (
        <p>
          Entre com uma sessão administrativa válida para enviar arquivos. Se já entrou, tente
          novamente.
        </p>
      )}
    </main>
  );
}
