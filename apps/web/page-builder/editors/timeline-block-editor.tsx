"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  TIMELINE_V1_LIMITS,
  timelineBlockDataSchemaV1,
  type TimelineBlockDataV1,
  type TimelineItemV1,
} from "@fumep/validation";

export interface TimelineBlockEditorProps {
  initialValue: unknown;
  onApply: (value: TimelineBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function TimelineBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: TimelineBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = timelineBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial TIMELINE v1 é inválido. Seus dados não foram substituídos.
      </p>
    );
  const valid = timelineBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (value: TimelineBlockDataV1, announcement = "") => {
    if (disabled || applying.current) return;
    setDraft(value);
    setMessage("");
    if (announcement) notify(announcement);
  };
  const edit = (index: number, patch: Partial<TimelineItemV1>) =>
    update({
      ...draft,
      items: draft.items.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    });
  const move = (index: number, target: number) => {
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    const [item] = items.splice(index, 1);
    items.splice(target, 0, item!);
    update({ ...draft, items }, `Marco movido para a posição ${target + 1} de ${items.length}.`);
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = timelineBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija os marcos: título e descrição são obrigatórios.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify(
        "Linha do tempo aplicada ao bloco em edição. Isso não publica nem salva a página no servidor.",
      );
    } catch {
      notify("Não foi possível aplicar a linha do tempo. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="timeline-block-editor"
      aria-label={ariaLabel ?? "Editor TIMELINE v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>Linha do tempo</legend>
        <label htmlFor={`${id}-title`}>Título do bloco (opcional)</label>
        <input
          id={`${id}-title`}
          value={draft.title ?? ""}
          maxLength={TIMELINE_V1_LIMITS.titleCharacters}
          onChange={(event) => update({ ...draft, title: event.target.value || undefined })}
        />
        <ol className="timeline-editor-items">
          {draft.items.map((item, index) => (
            <li key={index}>
              <fieldset>
                <legend>Marco {index + 1}</legend>
                <label htmlFor={`${id}-${index}-date`}>Data ou período (opcional)</label>
                <input
                  id={`${id}-${index}-date`}
                  value={item.date ?? ""}
                  maxLength={TIMELINE_V1_LIMITS.dateCharacters}
                  onChange={(event) => edit(index, { date: event.target.value || undefined })}
                />
                <label htmlFor={`${id}-${index}-title`}>Título do marco</label>
                <input
                  id={`${id}-${index}-title`}
                  value={item.title}
                  maxLength={TIMELINE_V1_LIMITS.itemTitleCharacters}
                  aria-invalid={!item.title.trim()}
                  onChange={(event) => edit(index, { title: event.target.value })}
                />
                <label htmlFor={`${id}-${index}-description`}>Descrição do marco</label>
                <textarea
                  id={`${id}-${index}-description`}
                  value={item.description}
                  maxLength={TIMELINE_V1_LIMITS.descriptionCharacters}
                  aria-invalid={!item.description.trim()}
                  onChange={(event) => edit(index, { description: event.target.value })}
                />
                <div
                  className="timeline-editor-actions"
                  aria-label={`Ordenar ou remover marco ${index + 1}`}
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    Subir marco {index + 1}
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    Descer marco {index + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        {
                          ...draft,
                          items: draft.items.filter((_, position) => position !== index),
                        },
                        `Marco ${index + 1} removido do draft local.`,
                      )
                    }
                  >
                    Remover marco {index + 1}
                  </button>
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={draft.items.length >= TIMELINE_V1_LIMITS.items}
          onClick={() =>
            update(
              {
                ...draft,
                items: [...draft.items, { title: "Novo marco", description: "Nova descrição" }],
              },
              `Marco ${draft.items.length + 1} adicionado ao draft local.`,
            )
          }
        >
          Adicionar marco
        </button>
        <p>Máximo de {TIMELINE_V1_LIMITS.items} marcos.</p>
        {!valid && (
          <p role="alert">
            Mantenha de 1 a {TIMELINE_V1_LIMITS.items} marcos com título e descrição.
          </p>
        )}
        <button type="submit">
          {busy ? "Aplicando linha do tempo…" : "Aplicar linha do tempo ao bloco"}
        </button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
