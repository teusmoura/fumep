import process from "node:process";

const keepAlive = setInterval(() => undefined, 60_000);

function shutdown(signal: NodeJS.Signals) {
  clearInterval(keepAlive);
  console.info(`Worker FUMEP encerrado (${signal}).`);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.info("Worker FUMEP iniciado.");
