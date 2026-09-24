import { expect, it } from "vitest";
import { FAQ_V1_LIMITS, faqBlockDataSchemaV1, faqBlockSchemaV1 } from "./index.js";

const item = () => ({ question: "Como me inscrevo?", answer: "Acesse a página de cursos." });
const data = () => ({ title: "Dúvidas", items: [item()] });
const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "FAQ",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: data(),
});

it("accepts 1 and 30 text-only questions in the exact FAQ v1 envelope", () => {
  expect(faqBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(
    faqBlockDataSchemaV1.safeParse({ items: Array.from({ length: FAQ_V1_LIMITS.items }, item) })
      .success,
  ).toBe(true);
});

it("rejects empty, oversized, blank, rich or versioned data", () => {
  for (const value of [
    { items: [] },
    { items: Array.from({ length: FAQ_V1_LIMITS.items + 1 }, item) },
    { items: [{ question: " ", answer: "Resposta" }] },
    { items: [{ question: "Pergunta", answer: " " }] },
    { items: [{ question: "a".repeat(FAQ_V1_LIMITS.questionCharacters + 1), answer: "Resposta" }] },
    { items: [{ question: "Pergunta", answer: "a".repeat(FAQ_V1_LIMITS.answerCharacters + 1) }] },
    { ...data(), title: "a".repeat(FAQ_V1_LIMITS.titleCharacters + 1) },
    { items: [{ ...item(), html: "<script>" }] },
  ])
    expect(faqBlockDataSchemaV1.safeParse(value).success).toBe(false);
  expect(faqBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
