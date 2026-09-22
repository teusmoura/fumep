"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  QUICK_LINK_ICON_VALUES,
  QUICK_LINKS_V1_LIMITS,
  quickLinksBlockDataSchemaV1,
  textLinkUrlSchemaV1,
  type QuickLinkIconV1,
  type QuickLinkItemV1,
  type QuickLinksBlockDataV1,
} from "@fumep/validation";

const iconLabels: Record<QuickLinkIconV1, string> = {
  ARROW_RIGHT: "Seta para a direita",
  EXTERNAL_LINK: "Link externo",
  DOWNLOAD: "Download",
  DOCUMENT: "Documento",
  CALENDAR: "Calendário",
  LOCATION: "Localização",
};

export interface QuickLinksBlockEditorProps {
  initialValue: unknown;
  onApply: (value: QuickLinksBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function QuickLinksBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: QuickLinksBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = quickLinksBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial QUICK_LINKS v1 é inválido. Seus dados não foram substituídos.
      </p>
    );
  const valid = quickLinksBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (value: QuickLinksBlockDataV1, announcement = "") => {
    if (disabled || applying.current) return;
    setDraft(value);
    setMessage("");
    if (announcement) notify(announcement);
  };
  const edit = (index: number, patch: Partial<QuickLinkItemV1>) =>
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
    update({ ...draft, items }, `Link movido para a posição ${target + 1} de ${items.length}.`);
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = quickLinksBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija título, rótulos, URLs e ícones controlados antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify(
        "QUICK_LINKS aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.",
      );
    } catch {
      notify("Não foi possível aplicar QUICK_LINKS. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="quick-links-block-editor"
      aria-label={ariaLabel ?? "Editor QUICK_LINKS v1"}
      onSubmit={apply}
    >
      <p>Ícones são opcionais e limitados ao catálogo visual do sistema.</p>
      <fieldset disabled={disabled || busy}>
        <legend>QUICK_LINKS — links rápidos</legend>
        <label htmlFor={`${id}-title`}>Título do bloco (opcional)</label>
        <input
          id={`${id}-title`}
          value={draft.title ?? ""}
          maxLength={QUICK_LINKS_V1_LIMITS.titleCharacters}
          onChange={(event) => update({ ...draft, title: event.target.value || undefined })}
        />
        <ol className="quick-links-editor-items">
          {draft.items.map((item, index) => (
            <li key={index}>
              <fieldset>
                <legend>Link rápido {index + 1}</legend>
                <label htmlFor={`${id}-${index}-label`}>Rótulo do link</label>
                <input
                  id={`${id}-${index}-label`}
                  value={item.label}
                  maxLength={QUICK_LINKS_V1_LIMITS.labelCharacters}
                  aria-invalid={!item.label.trim()}
                  onChange={(event) => edit(index, { label: event.target.value })}
                />
                <label htmlFor={`${id}-${index}-url`}>URL</label>
                <input
                  id={`${id}-${index}-url`}
                  value={item.url}
                  maxLength={2048}
                  aria-invalid={!textLinkUrlSchemaV1.safeParse(item.url).success}
                  onChange={(event) => edit(index, { url: event.target.value })}
                />
                <label htmlFor={`${id}-${index}-icon`}>Ícone opcional do sistema</label>
                <select
                  id={`${id}-${index}-icon`}
                  value={item.icon ?? ""}
                  onChange={(event) =>
                    edit(index, {
                      icon: QUICK_LINK_ICON_VALUES.includes(event.target.value as QuickLinkIconV1)
                        ? (event.target.value as QuickLinkIconV1)
                        : undefined,
                    })
                  }
                >
                  <option value="">Sem ícone</option>
                  {QUICK_LINK_ICON_VALUES.map((icon) => (
                    <option key={icon} value={icon}>
                      {iconLabels[icon]}
                    </option>
                  ))}
                </select>
                <div
                  className="quick-links-editor-actions"
                  aria-label={`Ordenar ou remover link rápido ${index + 1}`}
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    Subir link {index + 1}
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    Descer link {index + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        {
                          ...draft,
                          items: draft.items.filter((_, position) => position !== index),
                        },
                        `Link rápido ${index + 1} removido do draft local.`,
                      )
                    }
                  >
                    Remover link {index + 1}
                  </button>
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() =>
            update(
              { ...draft, items: [...draft.items, { label: "Novo link", url: "/" }] },
              `Link rápido ${draft.items.length + 1} adicionado ao draft local.`,
            )
          }
        >
          Adicionar link rápido
        </button>
        {!valid && <p role="alert">Mantenha ao menos um link com rótulo e URL segura.</p>}
        <button type="submit">
          {busy ? "Aplicando QUICK_LINKS…" : "Aplicar QUICK_LINKS ao bloco"}
        </button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
