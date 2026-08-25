#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
requested_backup="${1:-}"
service_was_running="false"
restore_finished="false"

cd "$project_root"

if [[ -n "$requested_backup" ]]; then
  if [[ "$requested_backup" == */* || ! "$requested_backup" =~ ^family-planner-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}Z\.sqlite$ ]]; then
    echo "Bitte nur den Dateinamen einer LX-Sicherung aus backups/ angeben." >&2
    exit 1
  fi
  if [[ ! -f "$project_root/backups/$requested_backup" ]]; then
    echo "Die ausgewählte Sicherung wurde in backups/ nicht gefunden." >&2
    exit 1
  fi
fi

restart_service() {
  if [[ "$service_was_running" == "true" ]]; then
    docker compose up -d --no-build family-planner >/dev/null
  fi
  if [[ "$restore_finished" != "true" ]]; then
    echo "Wiederherstellung abgebrochen; die vorherige Datenbank bleibt erhalten." >&2
  fi
}
trap restart_service EXIT

container_id="$(docker compose ps -q family-planner)"
if [[ -n "$container_id" ]]; then
  service_was_running="true"
  echo "LX Family wird für die Wiederherstellung angehalten ..."
  docker compose stop family-planner
fi

restore_arguments=(--restore)
if [[ -n "$requested_backup" ]]; then
  restore_arguments+=("/app/backups/$requested_backup")
fi
restore_arguments+=(--confirm-stopped)

docker compose run --rm --no-deps family-planner \
  node server/backup.js "${restore_arguments[@]}"

echo "LX Family wird mit der wiederhergestellten Datenbank gestartet ..."
docker compose up -d --no-build family-planner
service_was_running="false"
restore_finished="true"
trap - EXIT

echo "Wiederherstellung erfolgreich. Die vorherige Datenbank wurde zusätzlich in backups/ gesichert."
