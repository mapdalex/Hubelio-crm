# Dockerfile für CRM Next.js Anwendung
# Optimiert für Produktion

FROM node:20-alpine AS base

# Dependencies installieren
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Package files kopieren
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# pnpm installieren und Dependencies
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client generieren
RUN npx prisma generate

# Next.js bauen
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm build

# Runner Stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone Output kopieren
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Uploads Verzeichnis erstellen
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Prisma db push und Start (erstellt Tabellen falls nicht vorhanden)
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
