import { expect, it } from "vitest";
import { deleteMediaPayloadSchema, mediaDeletionResponseSchema } from "./index.js";
it("accepts only mediaId payload and REQUESTED acknowledgment, rejecting raw errors and extra fields", () => {
  const mediaId = crypto.randomUUID();
  expect(deleteMediaPayloadSchema.parse({ mediaId })).toEqual({ mediaId });
  expect(mediaDeletionResponseSchema.parse({ mediaId, status: "REQUESTED" })).toEqual({
    mediaId,
    status: "REQUESTED",
  });
  for (const input of [
    { mediaId: "bad" },
    { mediaId, key: "private" },
    { mediaId, userId: crypto.randomUUID() },
  ])
    expect(deleteMediaPayloadSchema.safeParse(input).success).toBe(false);
  for (const input of [
    { mediaId, status: "DELETED" },
    { mediaId, status: "REQUESTED", error: "secret" },
  ])
    expect(mediaDeletionResponseSchema.safeParse(input).success).toBe(false);
});
