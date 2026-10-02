import { randomBytes } from "node:crypto";
import { closeSync, constants, openSync, writeSync } from "node:fs";

const environmentPath = ".env";
let fileDescriptor;

try {
  fileDescriptor = openSync(
    environmentPath,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
    0o600,
  );
} catch (error) {
  if (error.code === "EEXIST") {
    console.error(".env already exists; it was left unchanged.");
    process.exitCode = 1;
  } else {
    throw error;
  }
}

if (fileDescriptor !== undefined) {
  const environment = [
    `SESSION_SECRET=${randomBytes(48).toString("hex")}`,
    `BOOTSTRAP_ADMIN_TOKEN=${randomBytes(32).toString("hex")}`,
    "APP_ORIGIN=http://localhost:5000",
    "AUTH_DATABASE_PATH=./data/apna-dhandha.sqlite",
    "",
  ].join("\n");

  try {
    writeSync(fileDescriptor, environment, null, "utf8");
    console.log(
      "Created .env with unique random auth secrets and local SQLite storage.",
    );
    console.log(
      "Keep .env private. Use the bootstrap token from it for first-admin setup.",
    );
  } catch (error) {
    process.exitCode = 1;
    throw error;
  } finally {
    closeSync(fileDescriptor);
  }
}
