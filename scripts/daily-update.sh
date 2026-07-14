#!/usr/bin/env bash
# Actualización diaria del host y del stack de Docker.
# Pensado para correr como root desde cron (apt necesita root).
# Log: /var/log/daily-update.log
set -uo pipefail

COMPOSE_DIR="/home/server/docker-services"
LOG="/var/log/daily-update.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "===== INICIO actualización diaria ====="

# --- 1) Sistema operativo (Debian/apt) ---
export DEBIAN_FRONTEND=noninteractive
log "apt-get update..."
apt-get update -y >>"$LOG" 2>&1
log "apt-get upgrade..."
apt-get -y -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold upgrade >>"$LOG" 2>&1
log "apt-get autoremove..."
apt-get -y autoremove >>"$LOG" 2>&1

# --- 2) Imágenes de Docker (stack compose) ---
cd "$COMPOSE_DIR" || { log "ERROR: no existe $COMPOSE_DIR"; exit 1; }
log "docker compose pull..."
docker compose pull >>"$LOG" 2>&1
log "docker compose up -d (recrea solo lo que cambió)..."
docker compose up -d >>"$LOG" 2>&1

# --- 3) Limpieza de imágenes viejas/colgadas ---
log "docker image prune..."
docker image prune -f >>"$LOG" 2>&1

# --- 4) Aviso si el sistema requiere reinicio (kernel/libs) ---
if [ -f /var/run/reboot-required ]; then
  log "AVISO: el sistema requiere reinicio (no se reinicia automáticamente)."
fi

log "===== FIN actualización diaria ====="
echo "" >>"$LOG"
