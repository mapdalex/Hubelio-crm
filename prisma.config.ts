import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  seed: {
    command: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
}
