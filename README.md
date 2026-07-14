# home-server

Stack de servidor casero autoalojado, definido por completo en un solo
`docker-compose.yml`. Este repo guarda **la estructura** del server (el compose,
las configs escritas a mano, el código de mi app propia y los scripts) para
poder **replicarlo desde cero** en otro equipo o en otro disco, clonando el repo
y levantando el stack.

> **Los archivos de media NO están acá.** Viven en un disco dedicado
> (`/mnt/hdd`) y no forman parte del repo. Tampoco se versiona el estado de
> runtime de cada app (bases SQLite, cachés, listas de descargas, etc.): eso se
> regenera al levantar el stack y se reconfigura desde la UI de cada servicio.

---

## Qué contiene el stack

Pipeline clásico de automatización *arr + servidores de media + infraestructura:

| Servicio      | Para qué                                   | Puerto | Nombre local        |
|---------------|--------------------------------------------|--------|---------------------|
| qbittorrent   | Cliente de descargas                       | 8080   | `qbit.lan`          |
| prowlarr      | Gestor de indexers                         | 9696   | `prowlarr.lan`      |
| radarr        | Automatización de películas                | 7878   | `radarr.lan`        |
| sonarr        | Automatización de series                   | 8989   | `sonarr.lan`        |
| jellyfin      | Servidor de video (transcode HW Intel)     | 8096   | `jellyfin.lan`      |
| navidrome     | Servidor de música                         | 4533   | `music.lan`         |
| kavita        | Ebooks y comics                            | 8085   | `kavita.lan`        |
| romm + romm-db| Juegos retro (con MariaDB)                 | 8083   | `romm.lan`          |
| poketracker   | App propia (React+Node) asistente Pokémon  | 8086   | `poke.lan`          |
| frigate       | NVR de cámaras de seguridad (detección IA) | 5000   | `frigate.lan`       |
| portainer     | Panel de Docker                            | 9000   | `portainer.lan`     |
| pihole        | DNS de la LAN + bloqueo de publicidad      | 8081   | `pihole.lan`        |
| caddy         | Reverse proxy (HTTPS `*.lan`)              | 80/443 | —                   |
| cups          | Impresión compartida + AirPrint            | 631    | —                   |

### Convención de almacenamiento

Un único disco externo montado en `/mnt/hdd` es la raíz de media compartida.
La mayoría de los servicios montan todo `/mnt/hdd` como `/data`; los servidores
de media montan subdirectorios concretos:

```
/mnt/hdd/torrents          # descargas de qbittorrent
/mnt/hdd/media/movies      # radarr / jellyfin
/mnt/hdd/media/tv          # sonarr / jellyfin
/mnt/hdd/media/music       # navidrome (:ro)
/mnt/hdd/media/books       # kavita
/mnt/hdd/media/games       # biblioteca de romm
/mnt/hdd/frigate           # grabaciones de las cámaras
```

Mantener descargadores y apps *arr sobre el mismo montaje `/data` permite
*hardlink*/movimiento atómico en vez de copiar. **Conservá ese layout de un solo
montaje** si agregás servicios.

---

## Qué se versiona y qué no

**Sí se versiona** (todo escrito a mano):

- `docker-compose.yml` — el stack completo.
- `.env.example` — plantilla de secretos (el `.env` real queda afuera).
- `caddy/conf/Caddyfile` + `caddy/conf/ca/root.crt` (CA raíz pública).
- `frigate/config/config.yml` — configuración de las cámaras.
- `pihole/etc-dnsmasq.d/02-local-dns.conf` — DNS local `*.lan`.
- `poketracker/` — código fuente de la app propia (sin `node_modules`/`data`).
- `scripts/` — mantenimiento del host.

**No se versiona** (estado de runtime, se regenera o reconfigura):

- Config/bases de datos de qbittorrent, prowlarr, radarr, sonarr, jellyfin,
  kavita, navidrome, portainer, romm.
- `pihole/etc-pihole/` (gravity, listas, FTL.db).
- `caddy/data` (incluye la **clave privada** de la CA), cachés, `node_modules`.
- El `.env` con secretos reales.
- Los archivos de media (`/mnt/hdd`).

---

## Replicar el server desde cero

Guía para levantar todo en un **equipo nuevo** o tras **cambiar el disco del
sistema**. El disco de media (`/mnt/hdd`) se conecta aparte (ver paso 4).

### 1. Requisitos en el host nuevo

- Linux (probado en Debian 13).
- Docker Engine + plugin Compose:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- Usuario con UID/GID **1000** (dueño de los archivos y de `/mnt/hdd`).
  Verificá con `id`; si tu usuario no es 1000, ajustá `PUID/PGID` y los
  `user:` del compose, o creá un usuario 1000.
- Para Jellyfin/Frigate con transcode por hardware: una GPU Intel con
  `/dev/dri` disponible.

### 2. Clonar el repo

```bash
git clone https://github.com/sebamontedoro/home-server.git
cd home-server
```

### 3. Crear el `.env` con los secretos

El `.env` real no está en el repo. Copiá la plantilla y completá los valores:

```bash
cp .env.example .env
nano .env      # completar contraseñas y API keys
```

> Si estás migrando, poné las **mismas** contraseñas de RomM que tenías, o vas a
> tener que resetear la base de RomM. El resto de las API keys (IGDB,
> SteamGridDB, RetroAchievements) son opcionales.

### 4. Preparar el disco de media (`/mnt/hdd`)

Conectá el disco de media y montalo en `/mnt/hdd`. Para que persista al reiniciar,
agregalo a `/etc/fstab` (buscá el UUID con `blkid`):

```bash
sudo blkid                                   # anotar el UUID del disco
echo 'UUID=<uuid>  /mnt/hdd  ext4  defaults  0  2' | sudo tee -a /etc/fstab
sudo mkdir -p /mnt/hdd && sudo mount -a
sudo chown -R 1000:1000 /mnt/hdd             # que lo posea el usuario 1000
```

Asegurate de que existan los subdirectorios de la convención de arriba
(`media/movies`, `media/tv`, `torrents`, etc.). Si es un disco nuevo/vacío:

```bash
mkdir -p /mnt/hdd/{torrents,frigate,media/{movies,tv,music,books,games}}
```

### 5. Ajustes específicos del hardware

Algunos valores dependen del equipo y **hay que revisarlos** en
`docker-compose.yml`:

- **GID de `render`/`video`** para Jellyfin y Frigate (`group_add: "992"` y
  `"44"`). Verificá los tuyos con:
  ```bash
  getent group render video
  ```
  y actualizá los números si difieren.
- **IP del servidor**: la red usa `192.168.1.14` fija en el Caddyfile
  (`jellyfin.lan`, `pihole.lan`) y en el DNS de Pi-hole
  (`pihole/etc-dnsmasq.d/02-local-dns.conf`). Si la IP del server cambia,
  actualizá esos dos archivos.
- **Cámaras (Frigate)**: `frigate/config/config.yml` apunta a `192.168.1.50`.
  Ajustá IP/usuario/URL RTSP según tus cámaras.
- **Pi-hole en modo host** toma el 8081/8443 (le deja el 80/443 a Caddy).

### 6. Levantar el stack

```bash
docker compose build      # construye la imagen de poketracker
docker compose up -d      # descarga imágenes y arranca todo
docker compose ps         # verificar que quede todo "running"/"healthy"
docker compose logs -f    # seguir logs si algo falla
```

### 7. Configurar el host (cron, monitoreo, firewall, SSH)

Todo lo que vive fuera del compose se instala con un solo script (idempotente):

```bash
sudo bash scripts/setup-host.sh
```

Cubre: rotación de logs de Docker + live-restore, crons de backup (03:00) y
actualización (04:00), monitoreo SMART de discos, SSH endurecido y firewall
ufw. Dos cosas a revisar en un equipo distinto:

- **Nombres de disco** en `/etc/smartd.conf` (`/dev/nvme0n1`, `/dev/sda`):
  verificar con `lsblk` y ajustar.
- **`/etc/msmtprc`** (envío de alertas por Gmail) tiene un secreto y no lo
  genera el script: restaurarlo de `host-etc.tar.gz` del backup, o recrearlo
  (ver sección Monitoreo).

El script **no apaga** el acceso SSH por contraseña hasta que exista una clave
en `~/.ssh/authorized_keys` (instalarla con `ssh-copy-id server@<ip>` desde tu
PC y volver a correrlo).

### 8. Reconfigurar las apps (lo que no está en el repo)

Como el estado de runtime no se versiona, hay que reconfigurar cada app desde su
UI (una sola vez):

- **Prowlarr** (`:9696`): agregar indexers; conectar Radarr y Sonarr como *apps*.
- **Radarr/Sonarr** (`:7878` / `:8989`): configurar qBittorrent como download
  client y las carpetas raíz (`/data/media/movies`, `/data/media/tv`).
- **qBittorrent** (`:8080`): password inicial en los logs
  (`docker compose logs qbittorrent`); fijar carpeta de descargas
  `/data/torrents`.
- **Jellyfin** (`:8096`): crear usuario, agregar bibliotecas apuntando a
  `/data/media/...`, activar transcode por hardware (QSV / VAAPI, `iHD`).
- **Navidrome / Kavita / RomM**: crear usuario admin y apuntar a la biblioteca.
- **Pi-hole** (`:8081`): password del panel = `PIHOLE_WEBPASSWORD` del `.env`.
  Reactivar como DNS de la LAN si corresponde.

### 9. HTTPS local `*.lan` (opcional pero recomendado)

Para entrar por `https://jellyfin.lan` etc.:

1. Pi-hole ya resuelve `*.lan` → IP del server (paso 5).
2. Caddy emite certificados con su **CA interna**. Para que el navegador confíe,
   instalá la CA raíz en cada dispositivo: entrá a `http://ca.lan` y descargá
   `root.crt`, luego instalala como autoridad de confianza en el sistema/navegador.

---

## Operación diaria

```bash
# Aplicar cambios tras editar docker-compose.yml (recrea solo lo que cambió)
docker compose up -d

# Validar el compose sin aplicar
docker compose config

# Recrear/reiniciar un servicio puntual
docker compose up -d <servicio>
docker compose restart <servicio>

# Logs
docker compose logs -f <servicio>

# Actualizar todas las imágenes y rodar hacia adelante
docker compose pull && docker compose up -d
```

`scripts/daily-update.sh` automatiza la actualización del host (apt) y del stack
(pull + up + prune); pensado para correr por cron como root.

---

## Backups

El estado de runtime (lo que **no** está en este repo) se respalda todas las
noches a las 03:00 en `/mnt/hdd/backups/<fecha>/` (retención: 7 días), vía
`scripts/backup-configs.sh` desde cron:

- `configs.tar.gz` — dirs de config de todos los servicios + `.env`. Los
  servicios con SQLite se detienen ~1 min durante la copia (copia en frío).
- `romm-db.sql.gz` — dump de la MariaDB de RomM (en caliente).
- `host-etc.tar.gz` — config del host fuera del compose: `smartd` (monitoreo
  SMART de discos con alertas por mail), `msmtp` (envío por Gmail), crons y
  `daemon.json` de Docker. En un host nuevo se restaura con
  `tar xzf host-etc.tar.gz -C /` + `apt install smartmontools msmtp-mta bsd-mailx`.

En un **host nuevo**, esto convierte el paso 8 (reconfigurar apps a mano) en una
restauración directa:

```bash
# con el stack detenido (docker compose down), desde el dir del compose:
tar xzf /mnt/hdd/backups/<fecha>/configs.tar.gz
docker compose up -d
# restaurar la base de RomM:
zcat /mnt/hdd/backups/<fecha>/romm-db.sql.gz | \
  docker compose exec -T romm-db mariadb -uroot -p"$ROMM_DB_ROOT_PASSWORD"
docker compose restart romm
```

> El backup vive en el mismo equipo (otro disco). Para cubrir robo/incendio o
> falla doble, falta una copia externa (disco USB o remota) — pendiente.

---

## Monitoreo y alertas

`smartd` vigila la salud de los discos y avisa **por email** ante cualquier
degradación (sectores pendientes, atributos prefail, tests fallidos):

- **HDD de media**: test corto diario 02:00 + test largo (superficie completa)
  sábados 04:00.
- **NVMe**: test corto domingos 02:00.

Los mails salen por Gmail vía `msmtp`: smartd escribe a `root`, el alias
(`/etc/aliases`) lo manda a la casilla real, y `/etc/msmtprc` tiene la cuenta
de envío con una [contraseña de aplicación](https://myaccount.google.com/apppasswords)
de Google. Ese archivo no está en el repo (secreto); en un host nuevo se
restaura del backup o se recrea con esta forma (permisos `600`, dueño root):

```
defaults
auth on
tls  on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile /var/log/msmtp.log
aliases /etc/aliases

account gmail
host smtp.gmail.com
port 587
from <cuenta-de-envio>@gmail.com
user <cuenta-de-envio>@gmail.com
password <app-password-de-16-letras>

account default : gmail
```

Probar el canal: `echo "test" | sudo mail -s "[home-server] test" root` y
revisar `/var/log/msmtp.log`. Cualquier script del server puede alertar igual.

---

## Seguridad

- **Secretos** en `.env` (fuera de git); ver nota al final.
- **SSH solo con clave pública**: password y root deshabilitados
  (`/etc/ssh/sshd_config.d/10-hardening.conf`). Acceso de emergencia: consola
  física o Tailscale. Para autorizar otro dispositivo: agregar su clave a
  `~/.ssh/authorized_keys`.
- **Firewall ufw** (persistente): deny entrante por defecto; permiten entrada
  la LAN (`192.168.1.0/24`), Tailscale (`tailscale0`) y los bridges de Docker
  (`172.16.0.0/12`). **Ojo**: esa última regla no es opcional — Caddy corre en
  bridge y hace proxy hacia Jellyfin/Pi-hole que están en `network_mode: host`;
  sin ella esos routes devuelven 502.

---

## Nota de seguridad

Los secretos (contraseñas de RomM, API keys, password de Pi-hole) viven en `.env`,
que **no** se versiona. Si en algún momento estas claves estuvieron en un commit
público, conviene **rotarlas**. El `docker-compose.yml` las lee como variables
`${...}`; nunca pongas valores reales directamente en el compose.
