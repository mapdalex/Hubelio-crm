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
RUN apk add --no-cache openssl bash
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Standalone Output kopieren
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Next.js standalone output (enthaelt bereits node_modules mit Prisma Client)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Komplette node_modules fuer Prisma CLI kopieren
# pnpm hat eine spezielle Struktur, daher kopieren wir alles
COPY --from=builder /app/node_modules ./node_modules

# Uploads Verzeichnis erstellen
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Startup script erstellen
COPY --chmod=755 <<EOF /app/start.sh
#!/bin/sh
set -e

echo "============================================"
echo "CRM System startet..."
echo "============================================"
echo ""

echo "[1/5] Warte auf Datenbank (10 Sekunden)..."
sleep 10

echo ""
echo "[2/5] Pruefe Datenbankverbindung..."
echo "DATABASE_URL vorhanden: $([ -n "\$DATABASE_URL" ] && echo 'JA' || echo 'NEIN')"

echo ""
echo "[3/5] Regeneriere Prisma Client..."
npx prisma generate 2>&1 || {
  echo "WARNUNG: Prisma generate fehlgeschlagen, fahre trotzdem fort..."
}

echo ""
echo "[4/5] Fuehre Prisma db push aus..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo ""
  echo "WARNUNG: Prisma db push fehlgeschlagen, versuche es erneut in 5 Sekunden..."
  sleep 5
  npx prisma db push --accept-data-loss 2>&1 || {
    echo ""
    echo "FEHLER: Datenbankschema konnte nicht erstellt werden!"
    echo "Bitte pruefen Sie die DATABASE_URL und Datenbankverbindung."
    exit 1
  }
}

echo ""
echo "[5/5] Schema erfolgreich! Starte Server..."
echo ""
echo "============================================"
echo "CRM System bereit auf Port 3000"
echo "Oeffnen Sie /setup um den ersten Admin zu erstellen"
echo "============================================"
echo ""

exec node server.js
EOF

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
