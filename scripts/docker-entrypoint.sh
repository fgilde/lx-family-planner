#!/bin/sh
set -eu

data_uid="${PUID:-1000}"
data_gid="${PGID:-1000}"

case "$data_uid:$data_gid" in
  *[!0-9:]*|:*|*:)
    echo "PUID und PGID müssen numerische Linux-IDs sein." >&2
    exit 1
    ;;
esac

if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/data /app/backups
  if ! chown -R "$data_uid:$data_gid" /app/data /app/backups 2>/dev/null; then
    if ! gosu "$data_uid:$data_gid" test -w /app/data ||
       ! gosu "$data_uid:$data_gid" test -w /app/backups; then
      echo "Die Datenordner konnten nicht für $data_uid:$data_gid vorbereitet werden." >&2
      echo "Erlaube CHOWN, SETGID und SETUID oder passe PUID/PGID an." >&2
      exit 1
    fi
    echo "Hinweis: Besitzrechte bleiben unverändert; die Datenordner sind bereits beschreibbar." >&2
  fi
  if [ -z "${APP_SECRET:-}" ]; then
    secret_file="/app/data/.lx-family-app-secret"
    if gosu "$data_uid:$data_gid" test -r "$secret_file"; then
      APP_SECRET="$(gosu "$data_uid:$data_gid" cat "$secret_file")"
    else
      APP_SECRET="$(gosu "$data_uid:$data_gid" sh -c 'umask 077; node -e "process.stdout.write(require(\"node:crypto\").randomBytes(48).toString(\"hex\"))" > "$1"; cat "$1"' sh "$secret_file")"
    fi
    export APP_SECRET
  fi

  exec gosu "$data_uid:$data_gid" "$@"
fi

if [ ! -w /app/data ]; then
  echo "Der Datenordner /app/data ist für die Container-ID $(id -u):$(id -g) nicht beschreibbar." >&2
  echo "Starte den Container ohne feste Benutzer-ID oder passe PUID/PGID an." >&2
  exit 1
fi

if [ -z "${APP_SECRET:-}" ]; then
  secret_file="/app/data/.lx-family-app-secret"
  if [ -r "$secret_file" ]; then
    APP_SECRET="$(cat "$secret_file")"
  else
    umask 077
    APP_SECRET="$(node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('hex'))")"
    printf '%s\n' "$APP_SECRET" > "$secret_file"
  fi
  export APP_SECRET
fi

exec "$@"
