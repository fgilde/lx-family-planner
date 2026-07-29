#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
environment_file="$project_root/.env"
public_url="${1:-${NEXTCLOUD_PUBLIC_URL:-}}"
no_recreate="${2:-}"

die() {
  printf 'Fehler: %s\n' "$1" >&2
  exit 1
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

get_env() {
  local name="$1"
  sed -n "s/^${name}=//p" "$environment_file" | tail -n 1
}

append_domain() {
  local domains="$1"
  local candidate="$2"
  if [[ -z "$candidate" ]]; then
    printf '%s' "$domains"
  elif printf '%s\n' "$domains" | tr ' ' '\n' | grep -Fxq "$candidate"; then
    printf '%s' "$domains"
  else
    printf '%s %s' "$domains" "$candidate"
  fi
}

[[ -f "$environment_file" ]] ||
  die "Die .env-Datei fehlt. Bitte zuerst Nextcloud aktivieren."
[[ "$public_url" =~ ^https?://[^/?#[:space:]]+/?$ ]] ||
  die "Bitte eine vollständige Adresse ohne Pfad angeben, zum Beispiel https://cloud.example.de."

public_url="${public_url%/}"
authority="${public_url#*://}"
public_host="${authority%%:*}"
[[ -n "$public_host" ]] || die "Der Domainname konnte nicht gelesen werden."

trusted_domains="$(get_env NEXTCLOUD_TRUSTED_DOMAINS)"
trusted_domains="$(append_domain "$trusted_domains" localhost)"
trusted_domains="$(append_domain "$trusted_domains" nextcloud)"
trusted_domains="$(append_domain "$trusted_domains" "$public_host")"
trusted_domains="${trusted_domains# }"

set_env NEXTCLOUD_PUBLIC_URL "$public_url"
set_env NEXTCLOUD_TRUSTED_DOMAINS "$trusted_domains"
chmod 600 "$environment_file"

command -v docker >/dev/null 2>&1 || die "Docker wurde nicht gefunden."
cd "$project_root"

docker compose --profile nextcloud up -d nextcloud >/dev/null

ready="false"
for _ in $(seq 1 60); do
  if docker compose exec -T --user www-data nextcloud \
    php occ status --output=json 2>/dev/null |
    grep -q '"installed":true'; then
    ready="true"
    break
  fi
  sleep 2
done
[[ "$ready" == "true" ]] || die "Nextcloud ist noch nicht bereit."

existing_domains="$(
  docker compose exec -T --user www-data nextcloud \
    php occ config:system:get trusted_domains 2>/dev/null || true
)"
if ! printf '%s\n' "$existing_domains" | grep -Fxq "$public_host"; then
  next_index="$(
    printf '%s\n' "$existing_domains" |
      awk 'NF { count += 1 } END { print count + 0 }'
  )"
  docker compose exec -T --user www-data nextcloud \
    php occ config:system:set trusted_domains "$next_index" \
    --value="$public_host" >/dev/null
fi

docker compose exec -T --user www-data nextcloud \
  php occ config:system:set overwrite.cli.url \
  --value="$public_url" >/dev/null
if [[ "$public_url" == https://* ]]; then
  docker compose exec -T --user www-data nextcloud \
    php occ config:system:set overwriteprotocol \
    --value=https >/dev/null
fi

if [[ "$no_recreate" != "--no-recreate" ]]; then
  docker compose up -d --no-deps family-planner >/dev/null
fi

printf 'Family Cloud ist öffentlich eingerichtet: %s\n' "$public_url"
printf 'Vertrauenswürdige Domain: %s\n' "$public_host"
