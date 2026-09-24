"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  STATISTICS_V1_LIMITS,
  statisticsBlockDataSchemaV1,
  type StatisticsBlockDataV1,
  type StatisticItemV1,
} from "@fumep/validation";

export interface StatisticsBlockEditorProps {
  initialValue: unknown;
  onApply: (value: StatisticsBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function StatisticsBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: StatisticsBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = statisticsBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial STATISTICS v1 é inválido. Seus dados não foram substituídos.
      </p>
    );
  const valid = statisticsBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (value: StatisticsBlockDataV1, announcement = "") => {
    if (disabled || applying.current) return;
    setDraft(value);
    setMessage("");
    if (announcement) notify(announcement);
  };
  const edit = (index: number, patch: Partial<StatisticItemV1>) =>
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
    update(
      { ...draft, items },
      `Indicador movido para a posição ${target + 1} de ${items.length}.`,
    );
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = statisticsBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija os indicadores: valor e rótulo são obrigatórios.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify(
        "Indicadores aplicados ao bloco em edição. Isso não publica nem salva a página no servidor.",
      );
    } catch {
      notify("Não foi possível aplicar os indicadores. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="statistics-block-editor"
      aria-label={ariaLabel ?? "Editor STATISTICS v1"}
      onSubmit={apply}
    >
      <fieldset disabled={disabled || busy}>
        <legend>Indicadores</legend>
        <ol className="statistics-editor-items">
          {draft.items.map((item, index) => (
            <li key={index}>
              <fieldset>
                <legend>Indicador {index + 1}</legend>
                <label htmlFor={`${id}-${index}-value`}>Valor</label>
                <input
                  id={`${id}-${index}-value`}
                  value={item.value}
                  maxLength={STATISTICS_V1_LIMITS.valueCharacters}
                  aria-invalid={!item.value.trim()}
                  onChange={(event) => edit(index, { value: event.target.value })}
                />
                <label htmlFor={`${id}-${index}-label`}>Rótulo</label>
                <input
                  id={`${id}-${index}-label`}
                  value={item.label}
                  maxLength={STATISTICS_V1_LIMITS.labelCharacters}
                  aria-invalid={!item.label.trim()}
                  onChange={(event) => edit(index, { label: event.target.value })}
                />
                <label htmlFor={`${id}-${index}-description`}>Descrição (opcional)</label>
                <textarea
                  id={`${id}-${index}-description`}
                  value={item.description ?? ""}
                  maxLength={STATISTICS_V1_LIMITS.descriptionCharacters}
                  onChange={(event) =>
                    edit(index, { description: event.target.value || undefined })
                  }
                />
                <div
                  className="statistics-editor-actions"
                  aria-label={`Ordenar ou remover indicador ${index + 1}`}
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    Subir indicador {index + 1}
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    Descer indicador {index + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        {
                          ...draft,
                          items: draft.items.filter((_, position) => position !== index),
                        },
                        `Indicador ${index + 1} removido do draft local.`,
                      )
                    }
                  >
                    Remover indicador {index + 1}
                  </button>
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={draft.items.length >= STATISTICS_V1_LIMITS.items}
          onClick={() =>
            update(
              { ...draft, items: [...draft.items, { value: "0", label: "Novo indicador" }] },
              `Indicador ${draft.items.length + 1} adicionado ao draft local.`,
            )
          }
        >
          Adicionar indicador
        </button>
        <p>Máximo de {STATISTICS_V1_LIMITS.items} indicadores.</p>
        {!valid && (
          <p role="alert">
            Mantenha de 1 a {STATISTICS_V1_LIMITS.items} indicadores com valor e rótulo.
          </p>
        )}
        <button type="submit">
          {busy ? "Aplicando indicadores…" : "Aplicar indicadores ao bloco"}
        </button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
