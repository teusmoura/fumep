import { TEXT_V1_LIMITS, textLinkUrlSchemaV1, type TextInlineNodeV1 } from "@fumep/validation";
type TextRun = Extract<TextInlineNodeV1, { type: "text" }>;
function TextRunEditor({
  value,
  onChange,
  id,
}: {
  value: TextRun;
  onChange: (value: TextRun) => void;
  id: string;
}) {
  return (
    <div className="text-editor-run">
      <label htmlFor={id}>Texto do trecho</label>
      <textarea
        id={id}
        value={value.text}
        maxLength={TEXT_V1_LIMITS.runCharacters}
        rows={2}
        className={[
          value.marks?.includes("bold") ? "text-editor-bold" : "",
          value.marks?.includes("italic") ? "text-editor-italic" : "",
        ].join(" ")}
        onChange={(event) => onChange({ ...value, text: event.target.value })}
      />
      <div className="text-editor-actions">
        {(["bold", "italic"] as const).map((mark) => (
          <label key={mark}>
            <input
              type="checkbox"
              checked={value.marks?.includes(mark) ?? false}
              onChange={(event) =>
                onChange({
                  ...value,
                  marks: event.target.checked
                    ? [...(value.marks ?? []), mark]
                    : (value.marks?.filter((item) => item !== mark) ?? []),
                })
              }
            />
            {mark === "bold" ? "Negrito" : "Itálico"}
          </label>
        ))}
      </div>
    </div>
  );
}
export function TextInlineEditor({
  value,
  onChange,
  id,
}: {
  value: TextInlineNodeV1[];
  onChange: (value: TextInlineNodeV1[]) => void;
  id: string;
}) {
  const replace = (index: number, next: TextInlineNodeV1) =>
    onChange(value.map((node, position) => (position === index ? next : node)));
  return (
    <div className="text-editor-inlines">
      {value.map((node, index) => (
        <fieldset key={index}>
          <legend>
            Trecho {index + 1} — {node.type === "text" ? "texto" : "link"}
          </legend>
          {node.type === "text" ? (
            <TextRunEditor
              value={node}
              id={`${id}-${index}`}
              onChange={(next) => replace(index, next)}
            />
          ) : (
            <>
              <label htmlFor={`${id}-${index}-url`}>URL do link</label>
              <input
                id={`${id}-${index}-url`}
                value={node.url}
                maxLength={2048}
                aria-invalid={!textLinkUrlSchemaV1.safeParse(node.url).success}
                aria-describedby={`${id}-${index}-url-help`}
                onChange={(event) => replace(index, { ...node, url: event.target.value })}
              />
              <p id={`${id}-${index}-url-help`}>
                {textLinkUrlSchemaV1.safeParse(node.url).success
                  ? "Use HTTP(S), caminho do portal ou anchor."
                  : "URL inválida. Não use scripts, credenciais ou links iniciados com //."}
              </p>
              {node.children.map((child, childIndex) => (
                <div key={childIndex}>
                  <TextRunEditor
                    value={child}
                    id={`${id}-${index}-link-${childIndex}`}
                    onChange={(next) =>
                      replace(index, {
                        ...node,
                        children: node.children.map((item, position) =>
                          position === childIndex ? next : item,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    disabled={node.children.length <= 1}
                    onClick={() =>
                      replace(index, {
                        ...node,
                        children: node.children.filter((_, position) => position !== childIndex),
                      })
                    }
                  >
                    Remover texto {childIndex + 1} do link
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={node.children.length >= TEXT_V1_LIMITS.inlineNodes}
                onClick={() =>
                  replace(index, {
                    ...node,
                    children: [...node.children, { type: "text", text: "" }],
                  })
                }
              >
                Adicionar texto ao link
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, position) => position !== index))}
          >
            Remover trecho {index + 1}
          </button>
        </fieldset>
      ))}
      <div className="text-editor-actions">
        <button
          type="button"
          disabled={value.length >= TEXT_V1_LIMITS.inlineNodes}
          onClick={() => onChange([...value, { type: "text", text: "" }])}
        >
          Adicionar trecho de texto
        </button>
        <button
          type="button"
          disabled={value.length >= TEXT_V1_LIMITS.inlineNodes}
          onClick={() =>
            onChange([...value, { type: "link", url: "/", children: [{ type: "text", text: "" }] }])
          }
        >
          Adicionar link
        </button>
      </div>
    </div>
  );
}
