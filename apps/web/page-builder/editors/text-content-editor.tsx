import { TEXT_V1_LIMITS, type TextContentNodeV1 } from "@fumep/validation";
import { TextInlineEditor } from "./text-inline-editor";
import { TextTableEditor } from "./text-table-editor";
export function TextContentEditor({
  value,
  onChange,
  id,
}: {
  value: TextContentNodeV1;
  onChange: (value: TextContentNodeV1) => void;
  id: string;
}) {
  if (value.type === "table") return <TextTableEditor value={value} onChange={onChange} id={id} />;
  if (value.type === "orderedList" || value.type === "bulletList")
    return (
      <div>
        <p>{value.type === "orderedList" ? "Lista numerada" : "Lista com marcadores"}</p>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              type: value.type === "orderedList" ? "bulletList" : "orderedList",
            })
          }
        >
          Alternar tipo de lista
        </button>
        {value.items.map((item, index) => (
          <fieldset key={index}>
            <legend>Item {index + 1}</legend>
            <TextInlineEditor
              value={item.children}
              id={`${id}-item-${index}`}
              onChange={(next) =>
                onChange({
                  ...value,
                  items: value.items.map((current, position) =>
                    position === index ? { children: next } : current,
                  ),
                })
              }
            />
            <button
              type="button"
              disabled={value.items.length <= 1}
              onClick={() =>
                onChange({
                  ...value,
                  items: value.items.filter((_, position) => position !== index),
                })
              }
            >
              Remover item {index + 1}
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          disabled={value.items.length >= TEXT_V1_LIMITS.listItems}
          onClick={() =>
            onChange({
              ...value,
              items: [...value.items, { children: [{ type: "text", text: "" }] }],
            })
          }
        >
          Adicionar item à lista
        </button>
      </div>
    );
  return (
    <div className={`text-editor-content-${value.type}`}>
      {value.type === "heading" && (
        <>
          <label htmlFor={`${id}-level`}>Nível do título</label>
          <select
            id={`${id}-level`}
            value={value.level}
            onChange={(event) => {
              const level = Number(event.target.value);
              if (level === 2 || level === 3 || level === 4) onChange({ ...value, level });
            }}
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
            <option value={4}>H4</option>
          </select>
        </>
      )}
      <TextInlineEditor
        value={value.children}
        id={id}
        onChange={(next) => onChange({ ...value, children: next })}
      />
    </div>
  );
}
