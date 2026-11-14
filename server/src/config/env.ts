import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

dotenv.config({ path: resolve(rootDirectory, ".env") });
