import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Lade .env Datei manuell, da Prisma config das automatische Laden ueberspringt
config()

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  seed: {
    command: 'npx ts-node prisma/seed.ts',
  },
})
