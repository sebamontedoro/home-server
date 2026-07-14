#!/usr/bin/env bash
# Configuracion del HOST: todo lo que vive FUERA de docker-compose.
# Idempotente (se puede correr varias veces). Como root:
#   sudo bash /home/server/docker-services/scripts/setup-host.sh
#
# En un host NUEVO correr despues de clonar el repo y crear el .env. Cubre:
#   1. Paquetes: smartmontools, msmtp (mail), ufw.
#   2. /etc/docker/daemon.json: rotacion de logs (10MB x3) + live-restore.
#   3. Crons: backup nocturno (03:00) y daily-update (04:00).
#   4. smartd: monitoreo SMART de discos con alertas por mail.
#   5. SSH endurecido (password OFF solo si ya hay claves instaladas).
#   6. Firewall ufw: LAN + Tailscale + bridges de Docker.
#
# Lo UNICO que no recrea (tiene secretos): /etc/msmtprc y /etc/aliases.
# Restaurarlos del backup (host-etc.tar.gz) o rehacerlos a mano (README).
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Correr con sudo/root."; exit 1; }
COMPOSE_DIR="/home/server/docker-services"
cd "$COMPOSE_DIR"

echo "== 1/6: paquetes del host y zona horaria =="
apt-get update -qq
apt-get install -y -qq smartmontools msmtp-mta bsd-mailx ufw >/dev/null
# Hora local del host = la de los contenedores. Sin esto, cron y smartd
# interpretan sus horarios en UTC (3 horas "antes" de lo esperado).
timedatectl set-timezone America/Argentina/Cordoba
echo "   OK"

echo "== 2/6: /etc/docker/daemon.json (rotacion de logs + live-restore) =="
DAEMON_JSON='{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}'
if [ "$(cat /etc/docker/daemon.json 2>/dev/null)" = "$DAEMON_JSON" ]; then
  echo "   ya aplicado, sin cambios"
else
  [ -f /etc/docker/daemon.json ] && cp /etc/docker/daemon.json "/etc/docker/daemon.json.bak.$(date +%s)"
  echo "$DAEMON_JSON" > /etc/docker/daemon.json
  echo "   reiniciando Docker y recreando el stack (corte ~1 min, incluye DNS)..."
  systemctl restart docker
  docker compose up -d --force-recreate
  echo "   OK"
fi

echo "== 3/6: crons (backup 03:00, daily-update 04:00) =="
cat > /etc/cron.d/backup-configs <<'EOF'
# Backup nocturno del estado del stack -> /mnt/hdd/backups (retiene 7 dias).
0 3 * * * root /home/server/docker-services/scripts/backup-configs.sh
EOF
cat > /etc/cron.d/daily-update <<'EOF'
# Actualizacion diaria del host (apt) y del stack Docker (pull + up + prune).
0 4 * * * root /home/server/docker-services/scripts/daily-update.sh >> /var/log/daily-update.log 2>&1
EOF
chmod 644 /etc/cron.d/backup-configs /etc/cron.d/daily-update
echo "   OK"

echo "== 4/6: smartd (monitoreo de discos) =="
# OJO: nombres de disco del hardware actual (Dell Latitude 5400). En otro
# equipo verificar con 'lsblk' y ajustar /dev/nvme0n1 y /dev/sda.
cat > /etc/smartd.conf <<'EOF'
# Monitoreo SMART. Alertas por mail a root (-> Gmail via /etc/aliases + msmtp).
# Formato de -s: T/mes/dia/diaSemana/hora  (7=domingo, 6=sabado)

# NVMe del sistema: test corto los domingos 02:00.
/dev/nvme0n1 -a -m root -M diminishing -W 0,70,80 -s (S/../../7/02)

# HDD de media (/mnt/hdd). Baseline 2026-07-14: 16 Current_Pending_Sector.
# Si ese numero crece -> mail. Test corto diario 02:00, largo sabados 04:00.
/dev/sda -a -o on -S on -m root -M diminishing -W 0,45,50 -s (S/../.././02|L/../../6/04)
EOF
systemctl enable -q smartmontools
systemctl restart smartmontools
if [ ! -f /etc/msmtprc ]; then
  echo "   AVISO: falta /etc/msmtprc (envio de mails). Restaurar del backup"
  echo "   host-etc.tar.gz o crearlo a mano (ver README, seccion Monitoreo)."
fi
echo "   OK"

echo "== 5/6: SSH endurecido =="
# Guarda anti-lockout: el password de SSH se apaga SOLO si el usuario ya
# tiene una clave publica instalada y probada.
if [ -s /home/server/.ssh/authorized_keys ]; then
  PASSAUTH="no"
  echo "   hay authorized_keys -> acceso SOLO con clave"
else
  PASSAUTH="yes"
  echo "   AVISO: sin authorized_keys -> password queda ACTIVO."
  echo "   Instalar la clave (ssh-copy-id) y volver a correr este script."
fi
cat > /etc/ssh/sshd_config.d/10-hardening.conf <<EOF
# Endurecimiento de SSH (generado por setup-host.sh).
# Emergencia si se pierde la clave: consola fisica o Tailscale.
PermitRootLogin no
PasswordAuthentication $PASSAUTH
KbdInteractiveAuthentication $PASSAUTH
MaxAuthTries 3
X11Forwarding no
AllowAgentForwarding no
LoginGraceTime 30
EOF
sshd -t && systemctl reload ssh
echo "   OK"

echo "== 6/6: firewall ufw =="
# Deny entrante por defecto; entran: LAN, Tailscale, y los bridges de Docker.
# La regla 172.16.0.0/12 NO es opcional: Caddy (bridge) hace proxy hacia
# Jellyfin y Pi-hole que corren en network_mode:host; sin ella -> 502.
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw default allow routed >/dev/null
ufw allow from 192.168.1.0/24 comment 'LAN de casa' >/dev/null
ufw allow in on tailscale0 comment 'Tailscale' >/dev/null
ufw allow from 172.16.0.0/12 comment 'contenedores Docker -> host' >/dev/null
ufw --force enable >/dev/null
echo "   OK"

echo
echo "== Resumen =="
docker info --format '   live-restore: {{.LiveRestoreEnabled}}'
systemctl is-active smartmontools >/dev/null && echo "   smartd: activo"
ufw status | head -1 | sed 's/^/   ufw: /'
echo "   sshd password auth: $PASSAUTH"
# Primer backup solo si nunca corrio (en host nuevo, despues de levantar el stack)
if [ ! -d /mnt/hdd/backups ] && mountpoint -q /mnt/hdd; then
  echo
  echo "== No hay backups previos: corriendo el primero =="
  bash "$COMPOSE_DIR/scripts/backup-configs.sh"
fi
