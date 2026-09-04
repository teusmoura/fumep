import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is required");
}

const client = createClient({ url: redisUrl });

client.on("error", (error: unknown) => {
  console.error("Redis client error", error);
});

try {
  await client.connect();
  const response = await client.ping();

  if (response !== "PONG") {
    throw new Error(`Unexpected Redis PING response: ${response}`);
  }

  console.log("Redis PING successful");
} finally {
  if (client.isOpen) {
    await client.close();
  }
}
