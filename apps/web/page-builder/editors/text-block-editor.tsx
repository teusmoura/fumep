"use client";
import { useId, useReducer, useRef, useState, type FormEvent } from "react";
import {
  TEXT_V1_LIMITS,
  textBlockDataSchemaV1,
  type TextBlockDataV1,
  type TextContentNodeV1,
} from "@fumep/validation";
import { initialTextEditorState, newTextContentNode, textEditorReducer } from "./text-editor-state";
import { TextContentEditor } from "./text-content-editor";
const labels: Record<TextContentNodeV1["type"], string> = {
  paragraph: "Parágrafo",
  heading: "Título",
  highlight: "Destaque",
  orderedList: "Lista numerada",
  bulletList: "Lista com marcadores",
  table: "Tabela simples",
};
export interface TextBlockEditorProps {
  initialValue: unknown;
  onApply: (value: TextBlockDataV1) => void | Promise<void>;
  disabled?: boolean;
}
// Local draft only. Caller must remount with a block/version key when changing
// owners, authorize on the backend, and persist through its own REST workflow.
export function TextBlockEditor({ initialValue, onApply, disabled = false }: TextBlockEditorProps) {
  const id = useId();
  const status = useRef<HTMLParagraphElement>(null);
  const applying = useRef(false);
  const [state, dispatch] = useReducer(textEditorReducer, initialValue, initialTextEditorState);
  const [newType, setNewType] = useState<TextContentNodeV1["type"]>("paragraph");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const draft = state.draft;
  if (!draft)
    return (
      <p role="alert">
        O conteúdo inicial TEXT v1 é inválido. O editor não substituiu seus dados; verifique a
        origem.
      </p>
    );
  const validation = textBlockDataSchemaV1.safeParse(draft);
  const edit = (update: (data: TextBlockDataV1) => TextBlockDataV1) => {
    if (!disabled && !applying.current) {
      dispatch({ type: "edit", update });
      setMessage("");
    }
  };
  const notify = (value: string) => {
    setMessage(value);
    queueMicrotask(() => status.current?.focus());
  };
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || applying.current || !draft) return;
    const parsed = textBlockDataSchemaV1.safeParse(draft);
    if (!parsed.success) {
      notify("Corrija links, cabeçalhos ou limites do conteúdo antes de aplicar.");
      return;
    }
    applying.current = true;
    setBusy(true);
    try {
      await onApply(parsed.data);
      notify("Texto aplicado ao bloco em edição. Isso não publica nem salva a página no servidor.");
    } catch {
      notify("Não foi possível aplicar o texto. Suas alterações continuam no editor.");
    } finally {
      applying.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="text-block-editor"
      aria-label="Editor visual TEXT"
      aria-describedby={`${id}-help`}
      onSubmit={apply}
    >
      <p id={`${id}-help`}>
        Edite visualmente por trechos, sem JSON ou HTML. Negrito e itálico afetam o trecho; adicione
        outros trechos para combinar estilos e links.
      </p>
      <fieldset disabled={disabled || busy}>
        <legend>Conteúdo TEXT v1</legend>
        <label htmlFor={`${id}-title`}>Título do bloco (opcional)</label>
        <input
          id={`${id}-title`}
          value={draft.title ?? ""}
          maxLength={TEXT_V1_LIMITS.titleCharacters}
          onChange={(event) => edit((data) => ({ ...data, title: event.target.value }))}
        />
        <div className="text-editor-actions">
          <button
            type="button"
            disabled={!state.past.length}
            onClick={() => {
              if (disabled || applying.current) return;
              dispatch({ type: "undo" });
              notify("Última alteração desfeita.");
            }}
          >
            Desfazer
          </button>
          <button
            type="button"
            disabled={!state.future.length}
            onClick={() => {
              if (disabled || applying.current) return;
              dispatch({ type: "redo" });
              notify("Alteração refeita.");
            }}
          >
            Refazer
          </button>
        </div>
        <ol className="text-editor-nodes">
          {draft.content.nodes.map((node, index) => (
            <li key={index}>
              <fieldset>
                <legend>
                  {labels[node.type]} {index + 1}
                </legend>
                <TextContentEditor
                  value={node}
                  id={`${id}-node-${index}`}
                  onChange={(next) =>
                    edit((data) => ({
                      ...data,
                      content: {
                        ...data.content,
                        nodes: data.content.nodes.map((item, position) =>
                          position === index ? next : item,
                        ),
                      },
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() => {
                    edit((data) => ({
                      ...data,
                      content: {
                        ...data.content,
                        nodes: data.content.nodes.filter((_, position) => position !== index),
                      },
                    }));
                    notify("Conteúdo removido. Você pode desfazer esta alteração.");
                  }}
                >
                  Remover {labels[node.type].toLowerCase()} {index + 1}
                </button>
              </fieldset>
            </li>
          ))}
        </ol>
        <label htmlFor={`${id}-new-type`}>Adicionar conteúdo</label>
        <select
          id={`${id}-new-type`}
          value={newType}
          onChange={(event) => {
            if (Object.hasOwn(labels, event.target.value))
              setNewType(event.target.value as TextContentNodeV1["type"]);
          }}
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={draft.content.nodes.length >= TEXT_V1_LIMITS.nodes}
          onClick={() => {
            edit((data) => ({
              ...data,
              content: {
                ...data.content,
                nodes: [...data.content.nodes, newTextContentNode(newType)],
              },
            }));
            notify("Conteúdo adicionado. Use os campos identificados para editar.");
          }}
        >
          Adicionar ao texto
        </button>
        {!validation.success && (
          <p role="alert">
            Conteúdo inválido ou acima dos limites. Confira URLs, cabeçalhos e tamanho total do
            texto.
          </p>
        )}
        <button type="submit">{busy ? "Aplicando texto…" : "Aplicar texto ao bloco"}</button>
      </fieldset>
      <p role="status" ref={status} tabIndex={-1}>
        {message}
      </p>
    </form>
  );
}
