#!/usr/bin/env bash
# Baza va rasmlarning zaxira nusxasi: ./deploy/backup.sh  (cron bilan har kuni ishlatish mumkin)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${BACKUP_DIR:-$HOME/backups}"
mkdir -p "$OUT"
FILE="$OUT/cargo-$(date +%F-%H%M).tar.gz"
# SQLite WAL rejimida: avval bazaning izchil nusxasini olamiz
docker compose exec -T server node -e "
const D=require('better-sqlite3');
new D('/data/cargo.db').backup('/data/backup.db').then(()=>process.exit(0))"
docker compose run --rm --no-deps -T -v "$OUT:/out" --entrypoint sh server -c \
  "cd /data && tar czf /out/$(basename "$FILE") backup.db uploads && rm backup.db"
# 14 kundan eski nusxalarni o'chirish
find "$OUT" -name 'cargo-*.tar.gz' -mtime +14 -delete
echo "Tayyor: $FILE"
