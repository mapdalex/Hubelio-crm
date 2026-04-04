import path from "node:path"

export default {
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  seed: {
    command: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
}
