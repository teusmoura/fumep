"use client";
import { useId, useRef, useState } from "react";
import {
  HERO_V1_LIMITS,
  imageTextBlockDataSchemaV1,
  type ImageTextBlockDataV1,
  type TextBlockDataV1,
} from "@fumep/validation";
import { TextBlockEditor } from "./text-block-editor";
import { availableLibraryImages } from "../available-library-images";
export interface ImageTextBlockEditorProps {
  initialValue: unknown;
  images?: readonly unknown[];
  disabled?: boolean;
  ariaLabel?: string;
  onApply: (value: ImageTextBlockDataV1) => void | Promise<void>;
}
export function ImageTextBlockEditor({
  initialValue,
  images = [],
  disabled = false,
  ariaLabel,
  onApply,
}: ImageTextBlockEditorProps) {
  const [draft, setDraft] = useState(() => {
    const parsed = imageTextBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const applying = useRef(false);
  const id = useId();
  const available = availableLibraryImages(images);
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial IMAGE_TEXT v1 é inválido. Seus dados não foram substituídos.
      </p>
    );
  const selected = available.find((image) => image.id === draft.imageId);
  const parsedFallback = imageTextBlockDataSchemaV1.shape.imageAlt.safeParse(
    selected?.altText ?? undefined,
  );
  const fallback = parsedFallback.success ? parsedFallback.data?.trim() : undefined;
  const missingAlt = draft.imageAlt !== "" && !draft.imageAlt?.trim() && !fallback;
  function edit(patch: Partial<ImageTextBlockDataV1>) {
    if (!disabled && !applying.current)
      setDraft((value) => (value ? { ...value, ...patch } : value));
  }
  async function apply(text: TextBlockDataV1) {
    if (disabled || applying.current || !draft) throw new Error("Editor locked");
    const parsed = imageTextBlockDataSchemaV1.safeParse({
      ...draft,
      title: text.title,
      text: text.content,
    });
    if (!parsed.success || !selected || missingAlt) throw new Error("Invalid image/text");
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <TextBlockEditor
      ariaLabel={ariaLabel ?? "Editor IMAGE_TEXT v1"}
      initialValue={{ title: draft.title, content: draft.text }}
      disabled={disabled || busy}
      onApply={apply}
      applyLabel="Aplicar IMAGE_TEXT ao bloco"
      appliedMessage="IMAGE_TEXT aplicado ao bloco em edição. Isso não publica nem salva a página no servidor."
    >
      <p>Imagem, texto e CTA são aplicados juntos por Aplicar IMAGE_TEXT ao bloco.</p>
      <label htmlFor={`${id}-position`}>Posição da imagem</label>
      <select
        id={`${id}-position`}
        value={draft.imagePosition}
        onChange={(event) =>
          edit({ imagePosition: event.target.value as ImageTextBlockDataV1["imagePosition"] })
        }
      >
        <option value="IMAGE_LEFT">Imagem à esquerda</option>
        <option value="IMAGE_RIGHT">Imagem à direita</option>
      </select>
      <label htmlFor={`${id}-image`}>Imagem obrigatória da Biblioteca</label>
      <select
        id={`${id}-image`}
        value={draft.imageId}
        aria-invalid={!selected}
        onChange={(event) => {
          if (available.some((image) => image.id === event.target.value))
            edit({ imageId: event.target.value, imageAlt: undefined });
        }}
      >
        {!selected && (
          <option value={draft.imageId} disabled>
            Referência indisponível
          </option>
        )}
        {available.map((image) => (
          <option key={image.id} value={image.id}>
            {image.originalFilename}
          </option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={draft.imageAlt === ""}
          onChange={(event) => edit({ imageAlt: event.target.checked ? "" : undefined })}
        />
        Imagem decorativa (alt vazio)
      </label>
      {draft.imageAlt !== "" && (
        <>
          <label htmlFor={`${id}-alt`}>Texto alternativo contextual</label>
          <input
            id={`${id}-alt`}
            value={draft.imageAlt ?? ""}
            maxLength={HERO_V1_LIMITS.altCharacters}
            aria-invalid={Boolean(missingAlt)}
            onChange={(event) => edit({ imageAlt: event.target.value || undefined })}
          />
          <p>
            {fallback
              ? `Fallback da Biblioteca: ${fallback}`
              : "Preencha alt contextual ou marque explicitamente decoração."}
          </p>
        </>
      )}
      <label>
        <input
          type="checkbox"
          checked={Boolean(draft.button)}
          onChange={(event) =>
            edit({ button: event.target.checked ? { label: "", url: "/" } : undefined })
          }
        />
        Adicionar CTA
      </label>
      {draft.button && (
        <>
          <label htmlFor={`${id}-label`}>Rótulo do CTA</label>
          <input
            id={`${id}-label`}
            value={draft.button.label}
            maxLength={HERO_V1_LIMITS.buttonLabelCharacters}
            onChange={(event) => edit({ button: { ...draft.button!, label: event.target.value } })}
          />
          <label htmlFor={`${id}-url`}>URL do CTA</label>
          <input
            id={`${id}-url`}
            value={draft.button.url}
            maxLength={2048}
            onChange={(event) => edit({ button: { ...draft.button!, url: event.target.value } })}
          />
        </>
      )}
      {(!selected || missingAlt || !imageTextBlockDataSchemaV1.safeParse(draft).success) && (
        <p role="alert">Confira imagem disponível, alt/fallback e CTA seguro antes de aplicar.</p>
      )}
    </TextBlockEditor>
  );
}
