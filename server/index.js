import "dotenv/config";
import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createApp, verifyProductionEmailTransport } from "./app.js";

if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN) {
  throw new Error("APP_ORIGIN must be configured for production.");
}

const app = createApp();
const distDirectory = resolve("dist");
if (process.env.NODE_ENV === "production") {
  await verifyProductionEmailTransport();
  if (!existsSync(resolve(distDirectory, "index.html"))) {
    throw new Error("Production build is missing. Run npm run build first.");
  }
  app.use(express.static(distDirectory, { index: false }));
  app.get(/^(?!\/api(?:\/|$)).*/, (request, response) => {
    response.sendFile(resolve(distDirectory, "index.html"));
  });
}

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Apna Dhandha server listening on port ${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
