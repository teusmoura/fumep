"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import {
  HERO_V1_LIMITS,
  heroBlockDataSchemaV1,
  mediaLibraryResponseSchema,
  textLinkUrlSchemaV1,
  type HeroBlockDataV1,
} from "@fumep/validation";
export interface HeroBlockEditorProps {
  initialValue: unknown;
  images?: readonly unknown[];
  onApply: (value: HeroBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
}
// Remount by owner/block/version key. No fetching, persistence or authorization.
export function HeroBlockEditor({
  initialValue,
  images = [],
  onApply,
  disabled = false,
}: HeroBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = heroBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [decorative, setDecorative] = useState(() => draft?.imageAlt === "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const available = images
    .flatMap((value) => {
      const parsed = mediaLibraryResponseSchema.shape.items.element.safeParse(value);
      return parsed.success &&
        parsed.data.type === "IMAGE" &&
        parsed.data.processingStatus === "READY" &&
        ["image/png", "image/jpeg", "image/webp", "image/avif"].includes(parsed.data.mimeType)
        ? [parsed.data]
        : [];
    })
    .filter((image, index, all) => all.findIndex((item) => item.id === image.id) === index);
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial HERO v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const imageAvailable = !draft.imageId || available.some((image) => image.id === draft.imageId);
  const informativeAltMissing = Boolean(draft.imageId && !decorative && !draft.imageAlt?.trim());
  const valid =
    heroBlockDataSchemaV1.safeParse(draft).success && imageAvailable && !informativeAltMissing;
  const edit = (patch: Partial<HeroBlockDataV1>) => {
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
    const parsed = heroBlockDataSchemaV1.safeParse(draft);
    if (!valid || !parsed.success) {
      notify("Corrija título, imagem disponível, alt ou CTA antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(parsed.data);
      notify("HERO aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="hero-block-editor" aria-label="Editor HERO v1" onSubmit={apply}>
      <fieldset disabled={disabled || busy}>
        <legend>HERO — somente imagem</legend>
        <label htmlFor={`${id}-title`}>Título obrigatório</label>
        <input
          id={`${id}-title`}
          value={draft.title}
          maxLength={HERO_V1_LIMITS.titleCharacters}
          aria-invalid={!draft.title.trim()}
          onChange={(event) => edit({ title: event.target.value })}
        />
        <label htmlFor={`${id}-description`}>Descrição opcional</label>
        <textarea
          id={`${id}-description`}
          value={draft.description ?? ""}
          maxLength={HERO_V1_LIMITS.descriptionCharacters}
          onChange={(event) => edit({ description: event.target.value })}
        />
        <label htmlFor={`${id}-image`}>Imagem da Biblioteca de Mídia</label>
        <select
          id={`${id}-image`}
          value={draft.imageId ?? ""}
          aria-invalid={!imageAvailable}
          aria-describedby={`${id}-image-help`}
          onChange={(event) => {
            if (disabled || applying.current) return;
            const image = available.find((item) => item.id === event.target.value);
            if (event.target.value && !image) return;
            if (!image) {
              const rest = { ...draft };
              delete rest.imageId;
              delete rest.imageAlt;
              setDraft(rest);
              setDecorative(false);
              setMessage("");
            } else {
              setDecorative(false);
              edit({ imageId: image.id, imageAlt: image.altText?.trim() ?? "" });
            }
          }}
        >
          <option value="">Sem imagem</option>
          {!imageAvailable && (
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
        <p id={`${id}-image-help`}>
          Apenas imagens prontas da seleção disponível. A validação definitiva pertence ao backend.
        </p>
        {draft.imageId && (
          <>
            <label>
              <input
                type="checkbox"
                checked={decorative}
                onChange={(event) => {
                  if (disabled || applying.current) return;
                  setDecorative(event.target.checked);
                  edit({
                    imageAlt: event.target.checked
                      ? ""
                      : (available.find((image) => image.id === draft.imageId)?.altText?.trim() ??
                        ""),
                  });
                }}
              />
              Imagem decorativa (alt vazio)
            </label>
            {!decorative && (
              <>
                <label htmlFor={`${id}-alt`}>Texto alternativo contextual obrigatório</label>
                <input
                  id={`${id}-alt`}
                  value={draft.imageAlt ?? ""}
                  maxLength={HERO_V1_LIMITS.altCharacters}
                  aria-invalid={informativeAltMissing}
                  aria-describedby={`${id}-alt-help`}
                  onChange={(event) => edit({ imageAlt: event.target.value })}
                />
                <p id={`${id}-alt-help`}>
                  Descreva a informação transmitida pela imagem ou marque explicitamente decoração.
                </p>
              </>
            )}
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
            <label htmlFor={`${id}-label`}>Texto do CTA obrigatório</label>
            <input
              id={`${id}-label`}
              value={draft.button.label}
              maxLength={HERO_V1_LIMITS.buttonLabelCharacters}
              aria-invalid={!draft.button.label.trim()}
              onChange={(event) =>
                edit({ button: { ...draft.button!, label: event.target.value } })
              }
            />
            <label htmlFor={`${id}-url`}>URL do CTA</label>
            <input
              id={`${id}-url`}
              value={draft.button.url}
              maxLength={2048}
              aria-invalid={!textLinkUrlSchemaV1.safeParse(draft.button.url).success}
              aria-describedby={`${id}-url-help`}
              onChange={(event) => edit({ button: { ...draft.button!, url: event.target.value } })}
            />
            <p id={`${id}-url-help`}>
              Use HTTP(S), caminho do portal ou anchor, sem scripts ou credenciais.
            </p>
          </>
        )}
        {!valid && <p role="alert">Confira título, disponibilidade da imagem, alt e CTA válido.</p>}
        <button type="submit">{busy ? "Aplicando HERO…" : "Aplicar HERO ao bloco"}</button>
      </fieldset>
      <p role="status" tabIndex={-1} ref={status}>
        {message}
      </p>
    </form>
  );
}
