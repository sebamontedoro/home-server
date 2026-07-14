#!/usr/bin/env bash
# Backup nocturno del ESTADO de runtime del stack hacia /mnt/hdd/backups.
#
# El repo de GitHub guarda la ESTRUCTURA (compose, configs a mano); este script
# guarda lo que NO se versiona: bases SQLite de los *arr, config de Jellyfin,
# dump de la MariaDB de RomM, el .env con los secretos, etc.
#
# Pensado para correr como root desde cron (03:00, antes del daily-update de
# las 04:00). Detiene brevemente los servicios con SQLite para copiar en frio
# (evita bases corruptas), y los vuelve a levantar SIEMPRE (trap en EXIT).
# NO detiene: pihole (DNS de la casa), frigate (grabando), caddy, romm-db
# (se le hace dump en caliente), cups, portainer... salvo los listados abajo.
#
# Restaurar: descomprimir el tar en el dir del compose y, para RomM,
# importar el dump:  zcat romm-db.sql.gz | docker compose exec -T romm-db \
#   mariadb -uroot -p"$ROMM_DB_ROOT_PASSWORD"
set -uo pipefail

COMPOSE_DIR="/home/server/docker-services"
DEST_ROOT="/mnt/hdd/backups"
RETENTION_DAYS=7
LOG="/var/log/backup-configs.log"
STAMP="$(date '+%Y-%m-%d')"
DEST="$DEST_ROOT/$STAMP"

# Servicios que guardan estado en SQLite -> se detienen durante el tar.
STOP_SERVICES="qbittorrent prowlarr radarr sonarr jellyfin kavita navidrome poketracker romm portainer"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

cd "$COMPOSE_DIR" || { log "ERROR: no existe $COMPOSE_DIR"; exit 1; }

# El disco de media tiene que estar montado (si no, escribiriamos en el NVMe).
mountpoint -q /mnt/hdd || { log "ERROR: /mnt/hdd no esta montado, abortando"; exit 1; }

mkdir -p "$DEST"
chmod 700 "$DEST_ROOT"

log "===== INICIO backup -> $DEST ====="

# --- 1) Dump de la MariaDB de RomM (en caliente, con la DB corriendo) ---
# La password viene del entorno del propio contenedor: no hace falta el .env.
log "mariadb-dump de romm-db..."
if docker exec romm-db sh -c 'mariadb-dump -uroot -p"$MYSQL_ROOT_PASSWORD" --all-databases' 2>>"$LOG" | gzip > "$DEST/romm-db.sql.gz"; then
  log "  dump OK ($(du -h "$DEST/romm-db.sql.gz" | cut -f1))"
else
  log "  AVISO: fallo el dump de romm-db (¿contenedor caido?); sigo con el resto"
fi

# --- 2) Parar servicios con SQLite y garantizar que SIEMPRE vuelvan ---
restart_services() {
  log "reiniciando servicios..."
  docker compose start $STOP_SERVICES >>"$LOG" 2>&1
}
trap restart_services EXIT

log "deteniendo servicios con SQLite: $STOP_SERVICES"
docker compose stop -t 30 $STOP_SERVICES >>"$LOG" 2>&1

# --- 3) Tar de los directorios de estado + .env ---
# Excluye lo regenerable/pesado: cache de Jellyfin, artwork de RomM
# (resources), la DB cruda de MariaDB (ya dumpeada) y logs.
log "creando configs.tar.gz..."
tar czf "$DEST/configs.tar.gz" \
  --warning=no-file-changed \
  --exclude='jellyfin/cache' \
  --exclude='jellyfin/config/transcodes' \
  --exclude='romm/resources' \
  --exclude='romm/database' \
  --exclude='frigate/config/model_cache' \
  --exclude='*.log' \
  .env \
  docker-compose.yml \
  qbittorrent/config prowlarr/config radarr/config sonarr/config \
  jellyfin/config kavita/config navidrome/data portainer/data \
  poketracker/data romm/config romm/assets \
  caddy/conf caddy/data cups/config \
  pihole/etc-pihole pihole/etc-dnsmasq.d \
  frigate/config \
  2>>"$LOG"
TAR_RC=$?
# tar rc=1 = "archivo cambio durante la lectura" (pihole/frigate en caliente):
# aceptable. rc>=2 = error real.
if [ "$TAR_RC" -ge 2 ]; then
  log "ERROR: tar fallo con codigo $TAR_RC"
  exit 1
fi

# --- 3b) Config del HOST fuera del compose (smartd, msmtp, cron, docker) ---
# Cosas de /etc que setup-host.sh no regenera del todo (p.ej. msmtprc tiene
# el app password de Gmail). Tar chico y separado.
log "creando host-etc.tar.gz..."
tar czf "$DEST/host-etc.tar.gz" -C / \
  --ignore-failed-read \
  etc/msmtprc etc/aliases etc/smartd.conf \
  etc/docker/daemon.json etc/cron.d \
  etc/systemd/logind.conf \
  2>>"$LOG" || log "  AVISO: host-etc con advertencias (archivos faltantes?)"

# --- 4) Verificar integridad del tar ---
if tar tzf "$DEST/configs.tar.gz" >/dev/null 2>&1; then
  log "  tar OK ($(du -h "$DEST/configs.tar.gz" | cut -f1))"
else
  log "ERROR: el tar no pasa la verificacion de integridad"
  exit 1
fi

# --- 5) Levantar los servicios de nuevo (tambien corre via trap) ---
restart_services
trap - EXIT

# --- 6) Retencion: borrar backups con mas de N dias ---
log "aplicando retencion ($RETENTION_DAYS dias)..."
find "$DEST_ROOT" -maxdepth 1 -mindepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} \; 2>>"$LOG"

log "backups actuales: $(ls -1 "$DEST_ROOT" | wc -l) | uso total: $(du -sh "$DEST_ROOT" | cut -f1)"
log "===== FIN backup ====="
echo "" >>"$LOG"
