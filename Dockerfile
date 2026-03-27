# Dockerfile für CRM Next.js Anwendung
# Optimiert für Produktion

FROM node:20-alpine AS base

# pnpm global installieren
RUN npm install -g pnpm@9

# Dependencies installieren
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Package files kopieren
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Dependencies installieren
RUN pnpm install --frozen-lockfile

# Builder Stage
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client generieren
RUN pnpm prisma generate

# Build-Zeit Environment Variables für Prisma
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Next.js bauen
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Runner Stage
FROM base AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone Output kopieren
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Prisma vollstaendig kopieren fuer db push
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Uploads Verzeichnis erstellen
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Startup script erstellen
COPY --chmod=755 <<EOF /app/start.sh
#!/bin/sh
set -e

echo "Warte auf Datenbank..."
sleep 5

echo "Fuehre Prisma db push aus..."
npx prisma db push --accept-data-loss || {
  echo "Prisma db push fehlgeschlagen, versuche es erneut..."
  sleep 3
  npx prisma db push --accept-data-loss
}

echo "Starte Server..."
exec node server.js
EOF

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
