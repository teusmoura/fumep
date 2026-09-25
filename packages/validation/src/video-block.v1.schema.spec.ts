import { expect, it } from "vitest";
import { parseVideoUrlV1, videoBlockDataSchemaV1, videoBlockSchemaV1 } from "./index.js";

const block = () => ({
  id: "11111111-1111-4111-8111-111111111111",
  type: "VIDEO",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
    title: "Aula",
    description: "Apresentação",
  },
});

it("accepts only controlled YouTube and Vimeo video URLs", () => {
  expect(videoBlockSchemaV1.safeParse(block()).success).toBe(true);
  expect(parseVideoUrlV1(block().data.url)).toEqual({
    provider: "YOUTUBE",
    videoId: "M7lc1UVf-VE",
    embedUrl: "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
  });
  expect(parseVideoUrlV1("https://youtu.be/M7lc1UVf-VE")?.provider).toBe("YOUTUBE");
  expect(parseVideoUrlV1("https://vimeo.com/123456789")).toEqual({
    provider: "VIMEO",
    videoId: "123456789",
    embedUrl: "https://player.vimeo.com/video/123456789",
  });
});

it("rejects spoofed hosts, arbitrary embeds, scripts, credentials, extra params and blank title", () => {
  for (const url of [
    "http://www.youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
    "https://evil.test/?v=M7lc1UVf-VE",
    "https://user:pass@youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtube.com/watch?v=M7lc1UVf-VE&autoplay=1",
    "https://vimeo.com/123456789?autoplay=1",
    "https://player.vimeo.com/video/123456789",
    "https://youtu.be/M7lc1UVf-VE#x",
    "javascript:alert(1)",
    "<iframe/>",
  ])
    expect(videoBlockDataSchemaV1.safeParse({ url, title: "Aula" }).success).toBe(false);
  expect(videoBlockDataSchemaV1.safeParse({ url: block().data.url, title: " " }).success).toBe(
    false,
  );
  expect(videoBlockDataSchemaV1.safeParse({ ...block().data, iframe: "<iframe/>" }).success).toBe(
    false,
  );
  expect(videoBlockSchemaV1.safeParse({ ...block(), schemaVersion: 2 }).success).toBe(false);
});
