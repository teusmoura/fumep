"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  IMAGE_V1_LIMITS,
  imageBlockDataSchemaV1,
  textLinkUrlSchemaV1,
  type ImageBlockDataV1,
} from "@fumep/validation";
import { availableLibraryImages } from "../available-library-images";
export interface ImageBlockEditorProps {
  initialValue: unknown;
  images?: readonly unknown[];
  onApply: (value: ImageBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}
// Caller remounts with owner/block/version key and persists/authorizes elsewhere.
export function ImageBlockEditor({
  initialValue,
  images = [],
  onApply,
  disabled = false,
  ariaLabel,
}: ImageBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = imageBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const available = availableLibraryImages(images);
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial IMAGE v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const selected = available.find((image) => image.id === draft.imageId);
  const parsedFallback = imageBlockDataSchemaV1.shape.alt.safeParse(selected?.altText ?? undefined);
  const fallback = parsedFallback.success ? (parsedFallback.data?.trim() ?? "") : "";
  const altMissing = !draft.decorative && !draft.alt?.trim() && !fallback;
  const valid = Boolean(selected) && !altMissing && imageBlockDataSchemaV1.safeParse(draft).success;
  const edit = (patch: Partial<ImageBlockDataV1>) => {
    if (disabled || applying.current) return;
    setDraft((value) => (value ? { ...value, ...patch } : value));
    setMessage("");
  };
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = imageBlockDataSchemaV1.safeParse(draft);
    if (!valid || !parsed.success) {
      notify("Corrija imagem disponível, alt, legenda ou link antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(parsed.data);
      notify("IMAGE aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="image-block-editor"
      aria-label={ariaLabel ?? "Editor IMAGE v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>IMAGE — Biblioteca de Mídia</legend>
        <label htmlFor={`${id}-image`}>Imagem obrigatória da Biblioteca de Mídia</label>
        <select
          id={`${id}-image`}
          value={draft.imageId}
          aria-invalid={!selected}
          onChange={(event) => {
            const image = available.find((item) => item.id === event.target.value);
            if (image) edit({ imageId: image.id, alt: "" });
          }}
        >
          {!selected && (
            <option value={draft.imageId} disabled>
              Imagem atual indisponível nesta seleção
            </option>
          )}
          {available.map((image) => (
            <option key={image.id} value={image.id}>
              {image.originalFilename}
            </option>
          ))}
        </select>
        <p>A seleção não autoriza acesso; o backend deve revalidar a imagem disponível.</p>
        <label>
          <input
            type="checkbox"
            checked={draft.decorative}
            onChange={(event) => edit({ decorative: event.target.checked, alt: "" })}
          />
          Imagem decorativa (alt vazio)
        </label>
        {!draft.decorative && (
          <>
            <label htmlFor={`${id}-alt`}>Texto alternativo contextual</label>
            <input
              id={`${id}-alt`}
              value={draft.alt ?? ""}
              maxLength={IMAGE_V1_LIMITS.altCharacters}
              aria-invalid={altMissing}
              aria-describedby={`${id}-alt-help`}
              onChange={(event) => edit({ alt: event.target.value })}
            />
            <p id={`${id}-alt-help`}>
              {fallback
                ? `Fallback disponível da Biblioteca: ${fallback}`
                : "Sem fallback válido. Preencha o alt contextual ou marque explicitamente decoração."}
            </p>
          </>
        )}
        <label htmlFor={`${id}-caption`}>Legenda opcional</label>
        <textarea
          id={`${id}-caption`}
          value={draft.caption ?? ""}
          maxLength={IMAGE_V1_LIMITS.captionCharacters}
          onChange={(event) => edit({ caption: event.target.value })}
        />
        <label>
          <input
            type="checkbox"
            checked={draft.link !== undefined}
            onChange={(event) => edit({ link: event.target.checked ? "/" : undefined })}
          />
          Adicionar link à imagem
        </label>
        {draft.link !== undefined && (
          <>
            <label htmlFor={`${id}-link`}>URL do link</label>
            <input
              id={`${id}-link`}
              value={draft.link}
              maxLength={2048}
              aria-invalid={!textLinkUrlSchemaV1.safeParse(draft.link).success}
              aria-describedby={`${id}-link-help`}
              onChange={(event) => edit({ link: event.target.value })}
            />
            <p id={`${id}-link-help`}>
              Use HTTP(S), caminho do portal ou anchor. Imagem decorativa com link precisa de
              legenda não vazia como nome acessível.
            </p>
          </>
        )}
        {!valid && (
          <p role="alert">
            Confira disponibilidade, alt informativo/fallback, legenda e link seguros.
          </p>
        )}
        <button type="submit">{busy ? "Aplicando IMAGE…" : "Aplicar IMAGE ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
