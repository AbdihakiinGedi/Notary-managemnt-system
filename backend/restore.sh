#!/bin/sh
set -e

info() { echo "[INFO] $1"; }
warn() { echo "[WARN] $1"; }

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-sndnprs}"

SCHEMA_FILE="${SCHEMA_FILE:-/app/models/schema.sql}"
SEED_FILE="${SEED_FILE:-/app/models/seed.sql}"

read -p "This will DROP and recreate the database '$DB_NAME'. Continue? (yes/no): " CONFIRM
[ "$CONFIRM" = "yes" ] || { warn "Aborted."; exit 0; }

info "Terminating existing connections to $DB_NAME (if any)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" \
  > /dev/null 2>&1 || true

info "Dropping existing database (if any)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

info "Creating fresh database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"

info "Restoring schema from $SCHEMA_FILE ..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$SCHEMA_FILE"

if [ -f "$SEED_FILE" ]; then
  info "Restoring seed data from $SEED_FILE ..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "$SEED_FILE"
else
  warn "No seed file found at $SEED_FILE, skipping."
fi

info "Restore complete!"
info "Tables restored:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "\dt"