import { describe, expect, it } from "vitest";
import { initialTextEditorState, newTextContentNode, textEditorReducer } from "./text-editor-state";
import { textBlockDataSchemaV1 } from "@fumep/validation";
describe("local TEXT editor draft", () => {
  it("clones validated input, never replaces invalid initial data, and creates only canonical nodes", () => {
    const value = { title: "Initial", content: { type: "doc", nodes: [] } };
    const state = initialTextEditorState(value);
    value.title = "Changed outside";
    expect(state.draft?.title).toBe("Initial");
    expect(initialTextEditorState({ html: "untrusted" }).draft).toBeUndefined();
    for (const type of [
      "paragraph",
      "heading",
      "highlight",
      "orderedList",
      "bulletList",
      "table",
    ] as const) {
      const node = newTextContentNode(type);
      expect(
        textBlockDataSchemaV1.safeParse({ content: { type: "doc", nodes: [node] } }).success,
      ).toBe(true);
    }
  });
  it("bounds undo/redo, retains editable invalid drafts and clears redo on a new edit", () => {
    let state = initialTextEditorState({ content: { type: "doc", nodes: [] } });
    for (let index = 0; index < 25; index++)
      state = textEditorReducer(state, {
        type: "edit",
        update: (draft) => ({ ...draft, title: String(index) }),
      });
    expect(state.past).toHaveLength(20);
    expect(state.draft?.title).toBe("24");
    state = textEditorReducer(state, { type: "undo" });
    expect(state.draft?.title).toBe("23");
    state = textEditorReducer(state, { type: "redo" });
    expect(state.draft?.title).toBe("24");
    state = textEditorReducer(state, { type: "undo" });
    state = textEditorReducer(state, {
      type: "edit",
      update: (draft) => ({ ...draft, title: "\u0000invalid" }),
    });
    expect(state.future).toEqual([]);
    expect(textBlockDataSchemaV1.safeParse(state.draft).success).toBe(false);
    state = textEditorReducer(state, { type: "undo" });
    expect(state.draft?.title).toBe("23");
  });
});
