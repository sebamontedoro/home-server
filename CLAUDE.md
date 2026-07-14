# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-host, self-hosted media server stack defined entirely by one `docker-compose.yml`. There is no application code, build step, or test suite — work here means editing the Compose file and the per-service config/data that lives alongside it. This is **not** a git repository.

## Common commands

```bash
# Apply changes after editing docker-compose.yml (recreates only changed containers)
docker compose up -d

# Validate the compose file without applying
docker compose config

# Recreate / restart a single service
docker compose up -d <service>        # e.g. jellyfin
docker compose restart <service>

# Logs
docker compose logs -f <service>
docker ps                              # all containers run with restart policies

# Pull newer images (everything is pinned to :latest) and roll forward
docker compose pull && docker compose up -d
```

## Architecture

The stack is the classic *arr media-automation pipeline plus standalone media servers:

- **Acquisition pipeline**: `prowlarr` (indexer manager) feeds `radarr` (movies) and `sonarr` (TV), which send downloads to `qbittorrent`. These services are wired together at runtime through each app's web UI (API keys, download-client config) — that state lives in the bind-mounted `./<service>/config` dirs, **not** in this repo.
- **Media servers** read the finished library: `jellyfin` (video, with hardware transcoding), `navidrome` (music, read-only mount), `kavita` (ebooks/comics), `romm` + `romm-db` (retro games, backed by MariaDB).
- **Infrastructure**: `portainer` (Docker UI, mounts the Docker socket read-only), `pihole` (LAN DNS + ad blocking), `caddy` (reverse proxy, HTTPS `*.lan`), `cups` (AirPrint/printer sharing, host network), `frigate` (camera NVR), `poketracker` (self-built app).

### Maintenance automation

- `scripts/daily-update.sh` — daily apt + `compose pull` + `up -d` via root cron at 04:00 (log: `/var/log/daily-update.log`).
- `scripts/backup-configs.sh` — nightly backup of runtime state (config dirs + `.env` + RomM DB dump) to `/mnt/hdd/backups/<date>/`, 7-day retention, root cron at 03:00 (log: `/var/log/backup-configs.log`). Briefly stops SQLite-holding services during the tar; always restarts them (EXIT trap).
- `scripts/setup-host.sh` — one-time root setup: Docker log rotation + live-restore in `/etc/docker/daemon.json`, backup cron install.

### Storage convention

A single external disk mounted at `/mnt/hdd` on the host is the shared media root. Most services bind-mount the whole `/mnt/hdd` as `/data`, while media servers mount specific subdirs:

```
/mnt/hdd/torrents          # qbittorrent downloads
/mnt/hdd/media/movies      # radarr / jellyfin
/mnt/hdd/media/tv          # sonarr / jellyfin
/mnt/hdd/media/music       # navidrome (mounted :ro)
/mnt/hdd/media/books       # kavita
/mnt/hdd/media/games       # romm library
```

Keeping downloaders and *arr apps on the same `/data` mount lets them hardlink/atomic-move instead of copying — preserve that single-mount layout when adding services.

### Per-service config layout

Each service has a sibling directory (`./jellyfin`, `./radarr`, …) bind-mounted to the container's config path. These dirs hold live runtime state (SQLite DBs, settings, caches) — treat them as data, not source. The MariaDB data for romm lives in `./romm/database`.

## Conventions when editing docker-compose.yml

- LinuxServer.io images (`lscr.io/linuxserver/*`) use `PUID=1000`/`PGID=1000` + `TZ`; non-LSIO images use `user: "1000:1000"`. Host UID/GID 1000 owns `/mnt/hdd`, so keep new services on UID 1000 to avoid permission breakage.
- `TZ=America/Argentina/Cordoba` everywhere.
- Public DNS (`8.8.8.8`, `1.1.1.1`) is set per-service so containers don't resolve through the pihole container.
- `jellyfin` runs with `network_mode: host`, `devices: /dev/dri` and `group_add` for render/video — required for Intel QSV hardware transcoding (`LIBVA_DRIVER_NAME=iHD`). Don't move it onto the bridge network.
- Comments in the file are in Spanish; match that style.

## Security note

Secrets (romm DB passwords, IGDB / SteamGridDB / RetroAchievements API keys, pihole `WEBPASSWORD`) live in a `.env` file that is **not** versioned (see `.gitignore`). `docker-compose.yml` reads them as `${VAR}` substitutions. Never put real secret values directly in the compose file — add the variable to `docker-compose.yml` as `${...}`, the real value to `.env`, and a placeholder to `.env.example`. When replicating the stack, copy `.env.example` to `.env` and fill it in.
