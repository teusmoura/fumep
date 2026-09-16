import { MediaQueue } from "@fumep/jobs";

const queue = new MediaQueue();
try {
  await queue.ping();
  console.log("BullMQ media queue Redis access successful");
} finally {
  await queue.close();
}
