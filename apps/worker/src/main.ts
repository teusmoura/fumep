import {
  createDatabase,
  MediaRepository,
  MediaVariantRepository,
  MediaProcessingRepository,
} from "@fumep/db";
import { createMediaWorker } from "@fumep/jobs";
import { MediaStorage } from "@fumep/storage";
import { processMediaJob } from "./process-media-job.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repository = new MediaRepository(db);
const variants = new MediaVariantRepository(db);
const states = new MediaProcessingRepository(db);
const storage = new MediaStorage();
const worker = createMediaWorker((job) =>
  processMediaJob(job, repository, states, variants, storage),
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
