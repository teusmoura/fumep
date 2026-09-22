"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  CARDS_V1_LIMITS,
  cardsBlockDataSchemaV1,
  imageBlockDataSchemaV1,
  textLinkUrlSchemaV1,
  type CardsBlockDataV1,
  type CardsBlockItemV1,
} from "@fumep/validation";
import { availableLibraryImages } from "../available-library-images";

export interface CardsBlockEditorProps {
  initialValue: unknown;
  images?: readonly unknown[];
  onApply: (value: CardsBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

// Draft-only collection UI. The caller remounts by owner/block/version and
// persists only after backend authorization and fresh media validation.
export function CardsBlockEditor({
  initialValue,
  images = [],
  onApply,
  disabled = false,
  ariaLabel,
}: CardsBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = cardsBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const available = availableLibraryImages(images);
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial CARDS v1 é inválido. Seus dados não foram substituídos.</p>
    );

  const availableById = new Map(available.map((image) => [image.id, image]));
  const hasValidAlt = (imageId: string) => {
    const parsed = imageBlockDataSchemaV1.shape.alt.safeParse(
      availableById.get(imageId)?.altText ?? undefined,
    );
    return parsed.success && Boolean(parsed.data?.trim());
  };
  const valid =
    cardsBlockDataSchemaV1.safeParse(draft).success &&
    draft.items.every((item) => availableById.has(item.imageId) && hasValidAlt(item.imageId));
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const replaceItems = (items: CardsBlockItemV1[], announcement = "") => {
    if (disabled || applying.current) return;
    setDraft({ items });
    setMessage("");
    if (announcement) notify(announcement);
  };
  const edit = (index: number, patch: Partial<CardsBlockItemV1>) => {
    replaceItems(
      draft.items.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  };
  const move = (index: number, target: number) => {
    if (target < 0 || target >= draft.items.length) return;
    const next = [...draft.items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    replaceItems(next, `Card movido para a posição ${target + 1} de ${next.length}.`);
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = cardsBlockDataSchemaV1.safeParse(draft);
    if (!valid || !parsed.success) {
      notify("Corrija cards, imagens disponíveis, alts da Biblioteca e URLs antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify("CARDS aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar CARDS. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      className="cards-block-editor"
      aria-label={ariaLabel ?? "Editor CARDS v1"}
      onSubmit={apply}
    >
      <p>
        CARDS usa somente imagens da Biblioteca com alt padrão válido; não aceita ícones. Máximo de
        {` ${CARDS_V1_LIMITS.items}`} cards.
      </p>
      <fieldset disabled={disabled || busy}>
        <legend>CARDS — itens com imagem</legend>
        <ol className="cards-editor-items">
          {draft.items.map((item, index) => {
            const selected = availableById.get(item.imageId);
            const altMissing = selected && !hasValidAlt(item.imageId);
            return (
              <li key={index}>
                <fieldset>
                  <legend>Card {index + 1}</legend>
                  <label htmlFor={`${id}-${index}-image`}>Imagem obrigatória da Biblioteca</label>
                  <select
                    id={`${id}-${index}-image`}
                    value={item.imageId}
                    aria-invalid={!selected || Boolean(altMissing)}
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
                  <p>
                    {selected && hasValidAlt(item.imageId)
                      ? `Alt da Biblioteca: ${selected.altText}`
                      : "A imagem precisa de alt válido na Biblioteca antes da aplicação."}
                  </p>
                  <label htmlFor={`${id}-${index}-title`}>Título do card</label>
                  <input
                    id={`${id}-${index}-title`}
                    value={item.title}
                    maxLength={CARDS_V1_LIMITS.titleCharacters}
                    aria-invalid={!item.title.trim()}
                    onChange={(event) => edit(index, { title: event.target.value })}
                  />
                  <label htmlFor={`${id}-${index}-description`}>Descrição opcional</label>
                  <textarea
                    id={`${id}-${index}-description`}
                    value={item.description ?? ""}
                    maxLength={CARDS_V1_LIMITS.descriptionCharacters}
                    onChange={(event) =>
                      edit(index, { description: event.target.value || undefined })
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={item.url !== undefined}
                      onChange={(event) =>
                        edit(index, { url: event.target.checked ? "/" : undefined })
                      }
                    />
                    Tornar card um link
                  </label>
                  {item.url !== undefined && (
                    <>
                      <label htmlFor={`${id}-${index}-url`}>URL do card</label>
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
                    className="cards-editor-actions"
                    aria-label={`Ordenar ou remover card ${index + 1}`}
                  >
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      Subir card {index + 1}
                    </button>
                    <button
                      type="button"
                      disabled={index === draft.items.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      Descer card {index + 1}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        replaceItems(
                          draft.items.filter((_, position) => position !== index),
                          `Card ${index + 1} removido do draft local.`,
                        )
                      }
                    >
                      Remover card {index + 1}
                    </button>
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          disabled={draft.items.length >= CARDS_V1_LIMITS.items || !available[0]}
          onClick={() => {
            const image = available[0];
            if (image)
              replaceItems(
                [...draft.items, { imageId: image.id, title: "Novo card" }],
                `Card ${draft.items.length + 1} adicionado ao draft local.`,
              );
          }}
        >
          Adicionar card
        </button>
        {!valid && (
          <p role="alert">
            Mantenha entre 1 e 12 cards com título, imagem READY e alt da Biblioteca, além de URLs
            seguras.
          </p>
        )}
        <button type="submit">{busy ? "Aplicando CARDS…" : "Aplicar CARDS ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
