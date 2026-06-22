#!/bin/bash
# Sincroniza estados y transacciones Bold automáticamente.
# Agregar al crontab: */15 * * * * /var/www/latiendasilvestrista/scripts/sync-bold.sh

BASE_URL="http://localhost:3090"
SECRET="69a2d8697d65d471b2e3218c138bad3da32c948a86ce81993b26776f9e517c0c"
LOG="/var/www/latiendasilvestrista/logs/sync-bold.log"

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

# 1. Sincronizar pagos pendientes → confirmar/cancelar
RESP=$(curl -s -X POST "$BASE_URL/api/admin/sync-bold" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $SECRET" \
  -w "\n%{http_code}")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -1)

if [ "$HTTP" = "200" ]; then
  UPDATED=$(echo "$BODY" | grep -o '"updated":[0-9]*' | grep -o '[0-9]*')
  echo "$(timestamp) [sync-bold] OK — actualizados: ${UPDATED:-0}" >> "$LOG"
else
  echo "$(timestamp) [sync-bold] ERROR HTTP $HTTP — $BODY" >> "$LOG"
fi

# 2. Guardar IDs de transacción en pedidos confirmados
RESP2=$(curl -s -X POST "$BASE_URL/api/admin/sync-bold-tx" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $SECRET" \
  -w "\n%{http_code}")

HTTP2=$(echo "$RESP2" | tail -1)
BODY2=$(echo "$RESP2" | head -1)

if [ "$HTTP2" = "200" ]; then
  UPDATED2=$(echo "$BODY2" | grep -o '"updated":[0-9]*' | grep -o '[0-9]*')
  echo "$(timestamp) [sync-bold-tx] OK — IDs guardados: ${UPDATED2:-0}" >> "$LOG"
else
  echo "$(timestamp) [sync-bold-tx] ERROR HTTP $HTTP2 — $BODY2" >> "$LOG"
fi
