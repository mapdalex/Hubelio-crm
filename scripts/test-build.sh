#!/bin/bash
# Test-Script um Build-Fehler zu finden
echo "=== Pruefe TypeScript Fehler ==="
npx tsc --noEmit 2>&1 | head -100

echo ""
echo "=== Pruefe Next.js Build ==="
pnpm build 2>&1 | tail -100
