import { describe, expect, it } from "vitest";
import { mediaChecksum } from "./media-checksum.js";

describe("mandatory server-side media SHA-256", () => {
  it.each([
    [Buffer.alloc(0), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    [Buffer.from("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [Buffer.from([0]), "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d"],
  ])("matches fixed reference vector %#", (bytes, expected) => {
    expect(mediaChecksum(bytes as Buffer)).toBe(expected);
  });
  it("hashes raw bytes without text conversion, mutation or state shared between requests", () => {
    const first = Buffer.from([0, 255, 128, 13, 10]);
    const copy = Buffer.from(first);
    const digest = mediaChecksum(first);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toEqual(copy);
    expect(mediaChecksum(Buffer.from(first))).toBe(digest);
    expect(mediaChecksum(Buffer.from([0, 255, 128, 13, 11]))).not.toBe(digest);
    expect(mediaChecksum(Buffer.from(first.toString("utf8"), "utf8"))).not.toBe(digest);
    expect(mediaChecksum(first)).toBe(digest);
  });
});
