"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  mediaUploadResponseSchema,
  pdfUploadResponseSchema,
  mediaDuplicateResponseSchema,
  mediaSelectionResponseSchema,
  type MediaSelection,
} from "@fumep/validation";
import type { UploadContext } from "./upload-context";

export function ImageUploadForm({
  csrfToken,
  isAdmin,
  categories,
  kind = "image",
}: UploadContext & { kind?: "image" | "pdf" }) {
  const pdf = kind === "pdf";
  const fileId = pdf ? "upload-pdf" : "upload-image";
  const categoryId = pdf ? "pdf-upload-category" : "upload-category";
  const helpId = pdf ? "pdf-help" : "image-help";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [duplicate, setDuplicate] = useState<MediaSelection>();
  const pending = useRef<FormData | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const choiceRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (busy) return;
    if (duplicate) choiceRef.current?.focus();
    else if (restoreFocus.current) {
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      restoreFocus.current = false;
    }
  }, [duplicate, busy]);
  function finish(message: string) {
    setMessage(message);
    setDuplicate(undefined);
    pending.current = undefined;
    formRef.current?.reset();
    restoreFocus.current = true;
  }
  async function upload(body: FormData) {
    setBusy(true);
    setMessage(pdf ? "Enviando PDF..." : "Enviando imagem...");
    try {
      const response = await fetch(pdf ? "/admin/media/upload-pdf" : "/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
        body,
      });
      if (!response.ok) throw new Error("upload");
      const data = await response.json();
      const warning = mediaDuplicateResponseSchema.safeParse(data);
      if (warning.success) {
        setDuplicate(warning.data.existing);
        setMessage("Este arquivo já existe. Escolha usar o existente ou enviar assim mesmo.");
        return;
      }
      const result = (pdf ? pdfUploadResponseSchema : mediaUploadResponseSchema).parse(data);
      finish(
        pdf
          ? `${result.originalFilename}: PDF salvo; pronto para uso.`
          : `${result.originalFilename}: original salvo; processamento pendente.`,
      );
    } catch {
      setMessage(
        `Não foi possível enviar. Verifique a categoria, o formato e o limite de ${pdf ? 30 : 15} MB. Tente novamente.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function selectExisting() {
    if (!duplicate) return;
    setBusy(true);
    try {
      const response = await fetch("/admin/media/select", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ id: duplicate.id }),
      });
      if (!response.ok) throw new Error("selection");
      const media = mediaSelectionResponseSchema.parse(await response.json());
      finish(
        `${media.originalFilename}: arquivo existente selecionado (${media.id}); status ${media.processingStatus}. Nenhum novo upload realizado.`,
      );
    } catch {
      setMessage("Não foi possível selecionar o arquivo. Verifique seu acesso e tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadAnyway() {
    if (!pending.current) return;
    pending.current.set("uploadAnyway", "true");
    await upload(pending.current);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    if (!body.get("categoryId")) body.delete("categoryId");
    pending.current = body;
    setDuplicate(undefined);
    await upload(body);
  }
  const unavailable = !isAdmin && categories.length === 0;
  return (
    <form
      ref={formRef}
      className="media-upload-form"
      onSubmit={submit}
      onChange={() => {
        setDuplicate(undefined);
        pending.current = undefined;
        setMessage("");
      }}
      aria-busy={busy}
    >
      <p id={helpId}>
        {pdf
          ? "PDF até 30 MB. Outros documentos não são aceitos."
          : "JPEG, PNG, WebP ou AVIF, até 15 MB. SVG não é aceito; use o formulário PDF para documentos."}
      </p>
      {unavailable && (
        <p>
          Não há categoria disponível em suas instituições. Solicite a criação de uma categoria
          antes do upload.
        </p>
      )}
      <label htmlFor={categoryId}>Categoria institucional</label>
      <select
        id={categoryId}
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
      <label htmlFor={fileId}>{pdf ? "Documento PDF" : "Imagem"}</label>
      <input
        id={fileId}
        name="file"
        type="file"
        accept={pdf ? ".pdf,application/pdf" : ".jpg,.jpeg,.png,.webp,.avif"}
        required
        aria-describedby={helpId}
        disabled={busy || unavailable}
      />
      <button type="submit" disabled={busy || unavailable}>
        {pdf ? "Enviar PDF" : "Enviar imagem"}
      </button>
      {duplicate && (
        <section aria-label="Arquivo duplicado">
          <p>Já existe: {duplicate.originalFilename}</p>
          <button ref={choiceRef} type="button" disabled={busy} onClick={selectExisting}>
            Usar arquivo existente
          </button>
          <button type="button" disabled={busy} onClick={uploadAnyway}>
            Enviar assim mesmo
          </button>
        </section>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
