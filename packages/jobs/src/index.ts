import { Queue, type DefaultJobOptions, type RedisOptions } from "bullmq";

export const MEDIA_QUEUE_NAME = "media";

export function mediaQueueConfiguration(env: NodeJS.ProcessEnv) {
  let url: URL;
  try {
    url = new URL(env.REDIS_URL ?? "");
  } catch {
    throw new Error("A valid REDIS_URL is required for the media queue");
  }
  if (
    !["redis:", "rediss:"].includes(url.protocol) ||
    !url.hostname ||
    url.search ||
    url.hash ||
    !/^\/(\d+)?$/.test(url.pathname || "/")
  ) {
    throw new Error("Invalid media queue Redis configuration");
  }
  const db = Number(url.pathname.slice(1) || 0);
  if (!Number.isSafeInteger(db) || db < 0) throw new Error("Invalid Redis database");
  let username: string;
  let password: string;
  try {
    username = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
  } catch {
    throw new Error("Invalid Redis credentials encoding");
  }
  const connection: RedisOptions = {
    host: url.hostname,
    port: Number(url.port || 6379),
    db,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy: (attempt) => (attempt <= 3 ? Math.min(attempt * 250, 1000) : null),
  };
  function retention(name: string, fallback: number) {
    const value = Number(env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${name}`);
    return value;
  }
  const defaultJobOptions: DefaultJobOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: {
      age: retention("MEDIA_QUEUE_COMPLETED_AGE", 86400),
      count: retention("MEDIA_QUEUE_COMPLETED_COUNT", 1000),
    },
    removeOnFail: {
      age: retention("MEDIA_QUEUE_FAILED_AGE", 604800),
      count: retention("MEDIA_QUEUE_FAILED_COUNT", 5000),
    },
    stackTraceLimit: 0,
    keepLogs: 100,
  };
  return { connection, defaultJobOptions };
}

/** Producer only: processing belongs exclusively to apps/worker. */
export class MediaQueue {
  private instance: Queue | undefined;
  private closed = false;
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly prefix = "bull",
  ) {}

  queue(): Queue {
    if (this.closed) throw new Error("Media queue is closed");
    if (!this.instance) {
      this.instance = new Queue(MEDIA_QUEUE_NAME, {
        ...mediaQueueConfiguration(this.env),
        prefix: this.prefix,
      });
      this.instance.on("error", () =>
        console.error(JSON.stringify({ event: "queue_error", queue: MEDIA_QUEUE_NAME })),
      );
    }
    return this.instance;
  }

  async ping(): Promise<void> {
    // Supported BullMQ Redis read, without adapter-specific client methods.
    await this.queue().getJobCounts("waiting");
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.instance?.close();
  }
}
