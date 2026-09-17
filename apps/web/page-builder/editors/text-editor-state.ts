import {
  textBlockDataSchemaV1,
  type TextBlockDataV1,
  type TextContentNodeV1,
} from "@fumep/validation";
export type TextEditorState = {
  draft?: TextBlockDataV1;
  past: TextBlockDataV1[];
  future: TextBlockDataV1[];
};
export type TextEditorAction =
  { type: "edit"; update: (draft: TextBlockDataV1) => TextBlockDataV1 } | { type: "undo" | "redo" };
export function initialTextEditorState(value: unknown): TextEditorState {
  const parsed = textBlockDataSchemaV1.safeParse(value);
  return { ...(parsed.success ? { draft: parsed.data } : {}), past: [], future: [] };
}
export function textEditorReducer(
  state: TextEditorState,
  action: TextEditorAction,
): TextEditorState {
  if (!state.draft) return state;
  if (action.type === "edit")
    return {
      draft: action.update(state.draft),
      past: [...state.past.slice(-19), state.draft],
      future: [],
    };
  if (action.type === "undo") {
    const draft = state.past.at(-1);
    if (!draft) return state;
    return {
      draft,
      past: state.past.slice(0, -1),
      future: [state.draft, ...state.future].slice(0, 20),
    };
  }
  const draft = state.future[0];
  if (!draft) return state;
  return { draft, past: [...state.past.slice(-19), state.draft], future: state.future.slice(1) };
}
export function newTextContentNode(type: TextContentNodeV1["type"]): TextContentNodeV1 {
  const children = [{ type: "text" as const, text: "" }];
  switch (type) {
    case "paragraph":
    case "highlight":
      return { type, children };
    case "heading":
      return { type, level: 2, children };
    case "orderedList":
    case "bulletList":
      return { type, items: [{ children }] };
    case "table":
      return { type, headers: ["Coluna 1"], rows: [[""]] };
  }
}
