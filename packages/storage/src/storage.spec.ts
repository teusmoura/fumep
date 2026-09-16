import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { MediaStorage, StorageLimitError } from "./index.js";

describe("bounded original read", () => {
  function fixture(chunks: Buffer[]) {
    const storage = new MediaStorage();
    const stream = Readable.from(chunks);
    vi.spyOn(storage, "client").mockReturnValue({
      getObject: async () => stream,
    } as unknown as ReturnType<MediaStorage["client"]>);
    return { storage, stream };
  }
  it("reads exact limit without modifying bytes and closes stream", async () => {
    const { storage, stream } = fixture([Buffer.from([0, 1]), Buffer.from([255])]);
    expect(await storage.read("fixture", 3)).toEqual(Buffer.from([0, 1, 255]));
    expect(stream.destroyed).toBe(true);
  });
  it("rejects oversize chunks and closes stream", async () => {
    const { storage, stream } = fixture([Buffer.alloc(4)]);
    await expect(storage.read("fixture", 3)).rejects.toBeInstanceOf(StorageLimitError);
    expect(stream.destroyed).toBe(true);
  });
  it("rejects invalid limits before storage access", async () => {
    const storage = new MediaStorage();
    const client = vi.spyOn(storage, "client");
    await expect(storage.read("fixture", 0)).rejects.toBeInstanceOf(StorageLimitError);
    expect(client).not.toHaveBeenCalled();
  });
});
