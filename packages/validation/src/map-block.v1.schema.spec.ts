import { expect, it } from "vitest";
import { mapBlockDataSchemaV1, mapBlockSchemaV1 } from "./index.js";

const data = () => ({
  title: "Campus",
  latitude: -22.735,
  longitude: -47.647,
  address: "Rua Exemplo, 1",
  zoom: 16,
});
const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "MAP",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: data(),
});

it("accepts structured location coordinates and optional title/zoom", () => {
  expect(mapBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(
    mapBlockDataSchemaV1.safeParse({ latitude: 0, longitude: 0, address: "Centro" }).success,
  ).toBe(true);
});

it("rejects invalid coordinates, address, zoom, arbitrary HTML/iframe and version", () => {
  for (const invalid of [
    { ...data(), latitude: 91 },
    { ...data(), latitude: Number.NaN },
    { ...data(), longitude: -181 },
    { ...data(), address: " " },
    { ...data(), zoom: 0 },
    { ...data(), zoom: 20 },
    { ...data(), zoom: 1.5 },
    { ...data(), iframe: "<iframe/>" },
    { ...data(), title: "\u0000" },
  ])
    expect(mapBlockDataSchemaV1.safeParse(invalid).success).toBe(false);
  expect(mapBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
