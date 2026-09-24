"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  CAROUSEL_V1_LIMITS,
  carouselBlockDataSchemaV1,
  textLinkUrlSchemaV1,
  type CarouselBlockDataV1,
  type CarouselItemV1,
} from "@fumep/validation";
import { availableLibraryImages } from "../available-library-images";

export interface CarouselBlockEditorProps {
  initialValue: unknown;
  images?: readonly unknown[];
  onApply: (value: CarouselBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function CarouselBlockEditor({
  initialValue,
  images = [],
  onApply,
  disabled = false,
  ariaLabel,
}: CarouselBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = carouselBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const available = availableLibraryImages(images);
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial CAROUSEL v1 é inválido. Seus dados não foram substituídos.
      </p>
    );
  const availableById = new Map(available.map((image) => [image.id, image]));
  const valid =
    carouselBlockDataSchemaV1.safeParse(draft).success &&
    draft.items.every((item) => availableById.has(item.imageId) && Boolean(item.alt.trim()));
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const replaceItems = (items: CarouselItemV1[], announcement = "") => {
    if (disabled || applying.current) return;
    setDraft({ items });
    setMessage("");
    if (announcement) notify(announcement);
  };
  const edit = (index: number, patch: Partial<CarouselItemV1>) =>
    replaceItems(
      draft.items.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  const move = (index: number, target: number) => {
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    const [item] = items.splice(index, 1);
    items.splice(target, 0, item!);
    replaceItems(items, `Slide movido para a posição ${target + 1} de ${items.length}.`);
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = carouselBlockDataSchemaV1.safeParse(draft);
    if (!valid || !parsed.success) {
      notify("Corrija imagens disponíveis, descrições alt e URLs antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify(
        "Carrossel aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.",
      );
    } catch {
      notify("Não foi possível aplicar o carrossel. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="carousel-block-editor"
      aria-label={ariaLabel ?? "Editor CAROUSEL v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>Carrossel de imagens</legend>
        <ol className="carousel-editor-items">
          {draft.items.map((item, index) => {
            const selected = availableById.get(item.imageId);
            return (
              <li key={index}>
                <fieldset>
                  <legend>Slide {index + 1}</legend>
                  <label htmlFor={`${id}-${index}-image`}>Imagem da Biblioteca</label>
                  <select
                    id={`${id}-${index}-image`}
                    value={item.imageId}
                    aria-invalid={!selected}
                    onChange={(event) => {
                      if (availableById.has(event.target.value))
                        edit(index, { imageId: event.target.value });
                    }}
                  >
                    {!selected && (
                      <option value={item.imageId} disabled>
                        Referência indisponível
                      </option>
                    )}
                    {available.map((image) => (
                      <option key={image.id} value={image.id}>
                        {image.originalFilename}
                      </option>
                    ))}
                  </select>
                  <label htmlFor={`${id}-${index}-alt`}>Descrição alt da imagem</label>
                  <input
                    id={`${id}-${index}-alt`}
                    value={item.alt}
                    maxLength={CAROUSEL_V1_LIMITS.altCharacters}
                    aria-invalid={!item.alt.trim()}
                    onChange={(event) => edit(index, { alt: event.target.value })}
                  />
                  <label htmlFor={`${id}-${index}-caption`}>Legenda (opcional)</label>
                  <textarea
                    id={`${id}-${index}-caption`}
                    value={item.caption ?? ""}
                    maxLength={CAROUSEL_V1_LIMITS.captionCharacters}
                    onChange={(event) => edit(index, { caption: event.target.value || undefined })}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={item.url !== undefined}
                      onChange={(event) =>
                        edit(index, { url: event.target.checked ? "/" : undefined })
                      }
                    />
                    Tornar slide um link
                  </label>
                  {item.url !== undefined && (
                    <>
                      <label htmlFor={`${id}-${index}-url`}>URL do slide</label>
                      <input
                        id={`${id}-${index}-url`}
                        value={item.url}
                        maxLength={2048}
                        aria-invalid={!textLinkUrlSchemaV1.safeParse(item.url).success}
                        onChange={(event) => edit(index, { url: event.target.value })}
                      />
                    </>
                  )}
                  <div
                    className="carousel-editor-actions"
                    aria-label={`Ordenar ou remover slide ${index + 1}`}
                  >
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      Subir slide {index + 1}
                    </button>
                    <button
                      type="button"
                      disabled={index === draft.items.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      Descer slide {index + 1}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        replaceItems(
                          draft.items.filter((_, position) => position !== index),
                          `Slide ${index + 1} removido do draft local.`,
                        )
                      }
                    >
                      Remover slide {index + 1}
                    </button>
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          disabled={draft.items.length >= CAROUSEL_V1_LIMITS.items || !available.length}
          onClick={() => {
            const first = available[0];
            if (first)
              replaceItems(
                [...draft.items, { imageId: first.id, alt: first.altText?.trim() || "" }],
                `Slide ${draft.items.length + 1} adicionado ao draft local.`,
              );
          }}
        >
          Adicionar slide
        </button>
        <p>Máximo de {CAROUSEL_V1_LIMITS.items} slides. Alt contextual obrigatório.</p>
        {!valid && <p role="alert">Mantenha de 1 a 10 slides com imagem pronta e alt não vazio.</p>}
        <button type="submit">
          {busy ? "Aplicando carrossel…" : "Aplicar carrossel ao bloco"}
        </button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
