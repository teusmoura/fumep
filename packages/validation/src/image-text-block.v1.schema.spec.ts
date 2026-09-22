import { expect, it } from "vitest";
import { imageTextBlockDataSchemaV1, imageTextBlockSchemaV1 } from "./index.js";
const id = "11111111-1111-4111-8111-111111111111";
const data = () => ({
  title: "Cursos",
  text: { type: "doc", nodes: [] },
  imageId: id,
  imagePosition: "IMAGE_LEFT",
});
it("accepts controlled layouts, safe rich text, optional CTA/alt and explicit decoration", () => {
  for (const imagePosition of ["IMAGE_LEFT", "IMAGE_RIGHT"])
    expect(
      imageTextBlockDataSchemaV1.safeParse({
        ...data(),
        imagePosition,
        imageAlt: "",
        button: { label: "Cursos", url: "/etmsl#cursos" },
      }).success,
    ).toBe(true);
  expect(imageTextBlockDataSchemaV1.safeParse(data()).success).toBe(true);
  expect(
    imageTextBlockDataSchemaV1.safeParse({
      ...data(),
      text: {
        type: "doc",
        nodes: [
          { type: "paragraph", children: [{ type: "text", text: "<script>literal</script>" }] },
        ],
      },
    }).success,
  ).toBe(true);
});
it("rejects free layout, invalid image/alt/title/CTA and unsafe or arbitrary text", () => {
  for (const invalid of [
    { imagePosition: "FREE" },
    { imageId: "bad" },
    { imageAlt: " " },
    { imageAlt: "a".repeat(301) },
    { title: "a".repeat(201) },
    { css: "color:red" },
    { text: "<p>HTML</p>" },
    {
      text: {
        type: "doc",
        nodes: [
          {
            type: "paragraph",
            children: [{ type: "link", url: "javascript:alert(1)", children: [] }],
          },
        ],
      },
    },
    { button: { label: "Curso", url: "javascript:alert(1)" } },
    { button: { label: " ", url: "/" } },
  ])
    expect(imageTextBlockDataSchemaV1.safeParse({ ...data(), ...invalid }).success).toBe(false);
});
it("requires exact IMAGE_TEXT version/envelope and its declared data fields", () => {
  const block = {
    id,
    type: "IMAGE_TEXT",
    schemaVersion: 1,
    position: 0,
    isVisible: true,
    background: "DEFAULT",
    data: data(),
  };
  expect(imageTextBlockSchemaV1.safeParse(block).success).toBe(true);
  for (const invalid of [
    { schemaVersion: 2 },
    { type: "IMAGE" },
    { anchor: "bad anchor" },
    { background: "IMAGE" },
  ])
    expect(imageTextBlockSchemaV1.safeParse({ ...block, ...invalid }).success).toBe(false);
  for (const key of ["imageId", "imagePosition", "text"]) {
    const input: Record<string, unknown> = data();
    delete input[key];
    expect(imageTextBlockDataSchemaV1.safeParse(input).success).toBe(false);
  }
});
