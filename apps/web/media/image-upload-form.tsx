"use client";
import { useState, type FormEvent } from "react";
import { mediaUploadResponseSchema } from "@fumep/validation";
import type { UploadContext } from "./upload-context";

export function ImageUploadForm({ csrfToken, isAdmin, categories }: UploadContext) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    if (!body.get("categoryId")) body.delete("categoryId");
    setBusy(true);
    setMessage("Enviando imagem...");
    try {
      const response = await fetch("/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
        body,
      });
      if (!response.ok) throw new Error("upload");
      const result = mediaUploadResponseSchema.parse(await response.json());
      setMessage(`${result.originalFilename}: original salvo; processamento pendente.`);
      form.reset();
    } catch {
      setMessage(
        "Não foi possível enviar. Verifique a categoria, o formato e o limite de 15 MB. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  const unavailable = !isAdmin && categories.length === 0;
  return (
    <form className="media-upload-form" onSubmit={submit} aria-busy={busy}>
      <p id="image-help">
        JPEG, PNG, WebP ou AVIF, até 15 MB. SVG e PDF não são aceitos nesta etapa.
      </p>
      {unavailable && (
        <p>
          Não há categoria disponível em suas instituições. Solicite a criação de uma categoria
          antes do upload.
        </p>
      )}
      <label htmlFor="upload-category">Categoria institucional</label>
      <select
        id="upload-category"
        name="categoryId"
        required={!isAdmin}
        disabled={busy || unavailable}
        defaultValue=""
      >
        <option value="">{isAdmin ? "Global / sem categoria" : "Selecione uma categoria"}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <label htmlFor="upload-image">Imagem</label>
      <input
        id="upload-image"
        name="file"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.avif"
        required
        aria-describedby="image-help"
        disabled={busy || unavailable}
      />
      <button type="submit" disabled={busy || unavailable}>
        Enviar imagem
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
