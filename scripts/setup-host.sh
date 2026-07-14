#!/usr/bin/env bash
# Configuracion del HOST que requiere root. Correr UNA vez con:
#   sudo bash /home/server/docker-services/scripts/setup-host.sh
#
# Hace tres cosas:
#   1. /etc/docker/daemon.json: rotacion de logs de contenedores (10MB x3)
#      + live-restore (reiniciar el daemon deja de reiniciar los contenedores).
#      Reinicia Docker y recrea el stack para que la rotacion aplique a todos.
#   2. Cron del backup nocturno (03:00) -> /etc/cron.d/backup-configs.
#   3. Primera corrida del backup, para validar que todo funciona.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Correr con sudo/root."; exit 1; }
COMPOSE_DIR="/home/server/docker-services"

echo "== 1/3: /etc/docker/daemon.json (rotacion de logs + live-restore) =="
if [ -f /etc/docker/daemon.json ]; then
  cp /etc/docker/daemon.json "/etc/docker/daemon.json.bak.$(date +%s)"
  echo "   (existia uno; respaldado como .bak)"
fi
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
EOF
echo "   reiniciando Docker..."
systemctl restart docker
echo "   recreando el stack para aplicar la rotacion a todos los contenedores"
echo "   (corte breve de ~1 min, incluye el DNS de Pi-hole)..."
cd "$COMPOSE_DIR"
docker compose up -d --force-recreate
echo "   OK"

echo "== 2/3: cron del backup nocturno (03:00) =="
cat > /etc/cron.d/backup-configs <<'EOF'
# Backup nocturno del estado del stack -> /mnt/hdd/backups (retiene 7 dias).
# Corre a las 03:00, una hora antes del daily-update de las 04:00.
0 3 * * * root /home/server/docker-services/scripts/backup-configs.sh
EOF
chmod 644 /etc/cron.d/backup-configs
echo "   OK"

echo "== 3/3: primera corrida del backup (tarda unos minutos) =="
bash "$COMPOSE_DIR/scripts/backup-configs.sh"

echo
echo "== Listo. Verificacion rapida: =="
docker info --format 'live-restore: {{.LiveRestoreEnabled}}'
ls -lh /mnt/hdd/backups/*/
