import {
  createDatabase,
  MediaRepository,
  MediaVariantRepository,
  MediaProcessingRepository,
} from "@fumep/db";
import { createMediaWorker, MediaQueue } from "@fumep/jobs";
import { MediaStorage } from "@fumep/storage";
import { processMediaJob } from "./process-media-job.js";
import { deleteMediaJob } from "./delete-media-job.js";
import { MediaDeletionReconciler } from "./reconcile-media-deletions.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const repository = new MediaRepository(db);
const variants = new MediaVariantRepository(db);
const states = new MediaProcessingRepository(db);
const storage = new MediaStorage();
const queue = new MediaQueue();
const reconciler = new MediaDeletionReconciler({ db, client }, queue);
const worker = createMediaWorker((job) =>
  job.name === "DELETE_MEDIA"
    ? deleteMediaJob(job, client, storage)
    : processMediaJob(job, repository, states, variants, storage),
);
reconciler.start();
worker.on("error", () =>
  console.error(JSON.stringify({ event: "worker_connection_error", queue: "media" })),
);
let shutdownStarted = false;
async function shutdown() {
  if (shutdownStarted) return;
  shutdownStarted = true;
  try {
    await reconciler.close();
    await worker.close();
  } finally {
    try {
      await queue.close();
    } finally {
      await client.end();
    }
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
