import { createDatabase, MediaRepository, MediaVariantRepository } from "@fumep/db";
import { createMediaWorker } from "@fumep/jobs";
import { receiveMediaJob } from "./receive-media.js";
import { MediaStorage } from "@fumep/storage";
import { processImage } from "./process-image.js";
import { persistMediaVariants } from "./media-variants.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repository = new MediaRepository(db);
const variants = new MediaVariantRepository(db);
const storage = new MediaStorage();
const worker = createMediaWorker((job) =>
  receiveMediaJob(
    job,
    (id) => repository.findById(id),
    undefined,
    (media) =>
      processImage(
        media,
        storage,
        (id, width, height) => repository.updateDimensions(id, width, height),
        (original, dimensions) =>
          persistMediaVariants(media.id, original, dimensions, storage, variants),
      ),
  ),
);
worker.on("error", () =>
  console.error(JSON.stringify({ event: "worker_connection_error", queue: "media" })),
);
let shutdownStarted = false;
async function shutdown() {
  if (shutdownStarted) return;
  shutdownStarted = true;
  try {
    await worker.close();
  } finally {
    await client.end();
  }
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown().catch(() => {
      console.error(JSON.stringify({ event: "worker_shutdown_failed" }));
      process.exitCode = 1;
    });
  });
}
await worker.waitUntilReady();
console.info(JSON.stringify({ event: "worker_ready", queue: "media" }));
