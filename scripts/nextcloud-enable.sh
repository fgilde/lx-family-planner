#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
environment_file="$project_root/.env"
example_file="$project_root/.env.example"
port="${NEXTCLOUD_PORT:-8080}"
admin_user="${NEXTCLOUD_ADMIN_USER:-familyadmin}"
no_start="false"

if [[ "${1:-}" == "--no-start" ]]; then
  no_start="true"
fi

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
  fi
}

get_env() {
  local name="$1"
  [[ -f "$environment_file" ]] || return 0
  sed -n "s/^${name}=//p" "$environment_file" | tail -n 1
}

set_env() {
  local name="$1"
  local value="$2"
  local temporary
  temporary="$(mktemp)"
  awk -v name="$name" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ ("^" name "=") {
      if (!found) print name "=" value
      found = 1
      next
    }
    { print }
    END { if (!found) print name "=" value }
  ' "$environment_file" >"$temporary"
  mv -- "$temporary" "$environment_file"
}

ensure_secret() {
  local name="$1"
  local current
  current="$(get_env "$name")"
  if [[ -z "$current" || "$current" == "disabled-profile" || "$current" == change-me* ]]; then
    current="$(random_secret)"
    set_env "$name" "$current"
  fi
  printf '%s' "$current"
}

if [[ ! -f "$environment_file" ]]; then
  cp -- "$example_file" "$environment_file"
fi
chmod 600 "$environment_file"

local_address="$(
  hostname -I 2>/dev/null |
    tr ' ' '\n' |
    grep -Ev '^(127\.|169\.254\.|$)' |
    head -n 1 || true
)"
trusted_domains="localhost nextcloud $(hostname)"
if [[ -n "$local_address" ]]; then
  trusted_domains="$trusted_domains $local_address"
fi

set_env COMPOSE_PROFILES nextcloud
set_env NEXTCLOUD_PORT "$port"
set_env NEXTCLOUD_ADMIN_USER "$admin_user"
set_env NEXTCLOUD_TRUSTED_DOMAINS "$trusted_domains"
admin_password="$(ensure_secret NEXTCLOUD_ADMIN_PASSWORD)"
ensure_secret NEXTCLOUD_DB_PASSWORD >/dev/null
ensure_secret NEXTCLOUD_DB_ROOT_PASSWORD >/dev/null
ensure_secret NEXTCLOUD_REDIS_PASSWORD >/dev/null

echo
echo "Nextcloud wurde sicher für den Docker-Stack vorbereitet."
echo "Benutzer: $admin_user"
echo "Einmaliges Startpasswort: $admin_password"
echo "Das Passwort steht zusätzlich geschützt in der lokalen .env-Datei."
echo

if [[ "$no_start" != "true" ]]; then
  command -v docker >/dev/null
  cd "$project_root"
  docker compose up -d --build
  echo "Nextcloud startet unter: http://${local_address:-localhost}:$port"
  echo "Die Ersteinrichtung wird abgeschlossen ..."

  ready="false"
  for _ in $(seq 1 60); do
    if docker compose exec -T --user www-data nextcloud \
      php occ status --output=json 2>/dev/null |
      grep -q '"installed":true'; then
      ready="true"
      break
    fi
    sleep 5
  done
  if [[ "$ready" != "true" ]]; then
    echo "Nextcloud wurde nicht innerhalb von fünf Minuten bereit." >&2
    docker compose ps
    exit 1
  fi

  if ! docker compose exec -T --user www-data nextcloud \
    php occ app:list --enabled 2>/dev/null |
    grep -qE '^[[:space:]]*-[[:space:]]+calendar:'; then
    echo "Die Nextcloud-Kalenderoberfläche wird installiert ..."
    if ! docker compose exec -T --user www-data nextcloud \
      php occ app:install calendar --no-interaction; then
      echo "Hinweis: Die zusätzliche Kalenderoberfläche konnte noch nicht installiert werden."
      echo "Der CalDAV-Abgleich von LX Family bleibt trotzdem verfügbar."
    fi
  fi
  docker compose exec -T --user www-data nextcloud \
    php occ background:cron >/dev/null
  echo "Nextcloud ist vollständig bereit: http://${local_address:-localhost}:$port"
fi
