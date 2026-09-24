"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  TABS_V1_LIMITS,
  tabsBlockDataSchemaV1,
  type TabsBlockDataV1,
  type TabItemV1,
  type TextInlineNodeV1,
} from "@fumep/validation";
import { TextInlineEditor } from "./text-inline-editor";

export interface TabsBlockEditorProps {
  initialValue: unknown;
  onApply: (value: TabsBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
}

export function TabsBlockEditor({
  initialValue,
  onApply,
  disabled = false,
  ariaLabel,
}: TabsBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [draft, setDraft] = useState(() => {
    const parsed = tabsBlockDataSchemaV1.safeParse(initialValue);
    return parsed.success ? parsed.data : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!draft)
    return (
      <p role="alert">O conteúdo inicial TABS v1 é inválido. Seus dados não foram substituídos.</p>
    );
  const valid = tabsBlockDataSchemaV1.safeParse(draft).success;
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  const update = (value: TabsBlockDataV1, announcement = "") => {
    if (disabled || applying.current) return;
    setDraft(value);
    setMessage("");
    if (announcement) notify(announcement);
  };
  const edit = (index: number, patch: Partial<TabItemV1>) =>
    update({
      tabs: draft.tabs.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    });
  const move = (index: number, target: number) => {
    if (target < 0 || target >= draft.tabs.length) return;
    const tabs = [...draft.tabs];
    const [item] = tabs.splice(index, 1);
    tabs.splice(target, 0, item!);
    update({ tabs }, `Aba movida para a posição ${target + 1} de ${tabs.length}.`);
  };
  const editParagraph = (
    tabIndex: number,
    paragraphIndex: number,
    children: TextInlineNodeV1[],
  ) => {
    const tab = draft.tabs[tabIndex]!;
    edit(tabIndex, {
      content: {
        ...tab.content,
        nodes: tab.content.nodes.map((node, index) =>
          index === paragraphIndex ? { ...node, children } : node,
        ),
      },
    });
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current) return;
    const parsed = tabsBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija rótulos e conteúdo das abas antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(structuredClone(parsed.data));
      setDraft(parsed.data);
      notify("TABS aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar TABS. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="tabs-block-editor" aria-label={ariaLabel ?? "Editor TABS v1"} onSubmit={apply}>
      <fieldset disabled={disabled || busy}>
        <legend>TABS — abas de conteúdo</legend>
        <ol className="tabs-editor-items">
          {draft.tabs.map((tab, index) => (
            <li key={index}>
              <fieldset>
                <legend>Aba {index + 1}</legend>
                <label htmlFor={`${id}-${index}-label`}>Rótulo da aba</label>
                <input
                  id={`${id}-${index}-label`}
                  value={tab.label}
                  maxLength={TABS_V1_LIMITS.labelCharacters}
                  aria-invalid={!tab.label.trim()}
                  onChange={(event) => edit(index, { label: event.target.value })}
                />
                <p>Conteúdo da aba: parágrafos, negrito, itálico e links seguros.</p>
                {tab.content.nodes.map((node, paragraphIndex) => (
                  <fieldset key={paragraphIndex}>
                    <legend>Parágrafo {paragraphIndex + 1}</legend>
                    <TextInlineEditor
                      value={node.children}
                      id={`${id}-${index}-paragraph-${paragraphIndex}`}
                      onChange={(children) => editParagraph(index, paragraphIndex, children)}
                    />
                    <button
                      type="button"
                      disabled={tab.content.nodes.length <= 1}
                      onClick={() =>
                        edit(index, {
                          content: {
                            ...tab.content,
                            nodes: tab.content.nodes.filter(
                              (_, position) => position !== paragraphIndex,
                            ),
                          },
                        })
                      }
                    >
                      Remover parágrafo {paragraphIndex + 1} da aba {index + 1}
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  disabled={tab.content.nodes.length >= TABS_V1_LIMITS.paragraphs}
                  onClick={() =>
                    edit(index, {
                      content: {
                        ...tab.content,
                        nodes: [
                          ...tab.content.nodes,
                          {
                            type: "paragraph",
                            children: [{ type: "text", text: "Novo parágrafo" }],
                          },
                        ],
                      },
                    })
                  }
                >
                  Adicionar parágrafo à aba {index + 1}
                </button>
                <div
                  className="tabs-editor-actions"
                  aria-label={`Ordenar ou remover aba ${index + 1}`}
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    Subir aba {index + 1}
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.tabs.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    Descer aba {index + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        { tabs: draft.tabs.filter((_, position) => position !== index) },
                        `Aba ${index + 1} removida do draft local.`,
                      )
                    }
                  >
                    Remover aba {index + 1}
                  </button>
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={draft.tabs.length >= TABS_V1_LIMITS.tabs}
          onClick={() =>
            update(
              {
                tabs: [
                  ...draft.tabs,
                  {
                    label: "Nova aba",
                    content: {
                      type: "doc",
                      nodes: [
                        { type: "paragraph", children: [{ type: "text", text: "Novo conteúdo" }] },
                      ],
                    },
                  },
                ],
              },
              `Aba ${draft.tabs.length + 1} adicionada ao draft local.`,
            )
          }
        >
          Adicionar aba
        </button>
        <p>Máximo de {TABS_V1_LIMITS.tabs} abas.</p>
        {!valid && <p role="alert">Mantenha de 1 a 8 abas com rótulos e conteúdo não vazios.</p>}
        <button type="submit">{busy ? "Aplicando TABS…" : "Aplicar TABS ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
