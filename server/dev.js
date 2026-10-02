import "dotenv/config";
import { createServer } from "vite";
import { createApp } from "./app.js";

const apiPort = Number(process.env.API_PORT) || 3001;
const apiServer = createApp().listen(apiPort, "127.0.0.1", () => {
  console.log(`Auth API listening on port ${apiPort}`);
});

const vite = await createServer();
await vite.listen();
console.log("Vite development app listening on port 5000");

const shutdown = async () => {
  apiServer.close();
  await vite.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
