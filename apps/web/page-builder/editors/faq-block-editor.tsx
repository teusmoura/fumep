"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  FAQ_V1_LIMITS,
  faqBlockDataSchemaV1,
  type FaqBlockDataV1,
  type FaqItemV1,
} from "@fumep/validation";

export interface FaqBlockEditorProps {
  initialValue: unknown;
  onApply: (value: FaqBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function FaqBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: FaqBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = faqBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial FAQ v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const valid = faqBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (value: FaqBlockDataV1, announcement = "") => {
    if (disabled || applying.current) return;
    setDraft(value);
    setMessage("");
    if (announcement) notify(announcement);
  };
  const edit = (index: number, patch: Partial<FaqItemV1>) =>
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
    update({ ...draft, items }, `Pergunta movida para a posição ${target + 1} de ${items.length}.`);
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = faqBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija título, perguntas e respostas antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify("FAQ aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar FAQ. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="faq-block-editor" aria-label={ariaLabel ?? "Editor FAQ v1"} onSubmit={apply}>
      <fieldset disabled={disabled || busy}>
        <legend>FAQ — perguntas frequentes</legend>
        <label htmlFor={`${id}-title`}>Título do bloco (opcional)</label>
        <input
          id={`${id}-title`}
          value={draft.title ?? ""}
          maxLength={FAQ_V1_LIMITS.titleCharacters}
          onChange={(event) => update({ ...draft, title: event.target.value || undefined })}
        />
        <ol className="faq-editor-items">
          {draft.items.map((item, index) => (
            <li key={index}>
              <fieldset>
                <legend>Pergunta {index + 1}</legend>
                <label htmlFor={`${id}-${index}-question`}>Pergunta</label>
                <input
                  id={`${id}-${index}-question`}
                  value={item.question}
                  maxLength={FAQ_V1_LIMITS.questionCharacters}
                  aria-invalid={!item.question.trim()}
                  onChange={(event) => edit(index, { question: event.target.value })}
                />
                <label htmlFor={`${id}-${index}-answer`}>Resposta</label>
                <textarea
                  id={`${id}-${index}-answer`}
                  value={item.answer}
                  maxLength={FAQ_V1_LIMITS.answerCharacters}
                  aria-invalid={!item.answer.trim()}
                  onChange={(event) => edit(index, { answer: event.target.value })}
                />
                <div
                  className="faq-editor-actions"
                  aria-label={`Ordenar ou remover pergunta ${index + 1}`}
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    Subir pergunta {index + 1}
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    Descer pergunta {index + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        {
                          ...draft,
                          items: draft.items.filter((_, position) => position !== index),
                        },
                        `Pergunta ${index + 1} removida do draft local.`,
                      )
                    }
                  >
                    Remover pergunta {index + 1}
                  </button>
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={draft.items.length >= FAQ_V1_LIMITS.items}
          onClick={() =>
            update(
              {
                ...draft,
                items: [...draft.items, { question: "Nova pergunta", answer: "Nova resposta" }],
              },
              `Pergunta ${draft.items.length + 1} adicionada ao draft local.`,
            )
          }
        >
          Adicionar pergunta
        </button>
        <p>Máximo de {FAQ_V1_LIMITS.items} perguntas.</p>
        {!valid && <p role="alert">Mantenha de 1 a 30 perguntas com respostas não vazias.</p>}
        <button type="submit">{busy ? "Aplicando FAQ…" : "Aplicar FAQ ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
