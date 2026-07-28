#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
data_directory="$project_root/data"
backup_directory="$project_root/backups"
database_file="$data_directory/family_planner.sqlite"
active_image="lx-family-planner:local"
rollback_image="lx-family-planner:rollback"
expected_version=""
previous_image_id=""
backup_file=""
service_stopped="false"

cd "$project_root"

wait_for_planner() {
  local attempts="${1:-40}"
  local expected_version="${2:-}"
  local attempt
  for ((attempt = 0; attempt < attempts; attempt += 1)); do
    if docker compose exec -T \
      -e "EXPECTED_VERSION=$expected_version" \
      family-planner node -e \
      "fetch('http://127.0.0.1:3001/api/health').then(async r=>{const h=await r.json();if(!r.ok||!h.success||(process.env.EXPECTED_VERSION&&h.version!==process.env.EXPECTED_VERSION))process.exit(1)}).catch(()=>process.exit(1))" \
      >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

restore_previous_version() {
  set +e
  echo "Die bisherige Version wird automatisch wiederhergestellt ..." >&2
  docker compose stop family-planner >/dev/null 2>&1
  if [[ -n "$backup_file" && -f "$backup_file" ]]; then
    case "$database_file" in
      "$project_root"/data/*)
        rm -f -- "$database_file" "$database_file-wal" "$database_file-shm"
        cp -- "$backup_file" "$database_file"
        ;;
      *)
        echo "Unsicherer Datenbankpfad; automatische Wiederherstellung abgebrochen." >&2
        return 1
        ;;
    esac
  fi
  if [[ -n "$previous_image_id" ]]; then
    docker tag "$previous_image_id" "$active_image"
  fi
  docker compose up -d --no-build --remove-orphans
  if wait_for_planner 30; then
    echo "Die vorherige Version läuft wieder." >&2
    return 0
  fi
  echo "Auch die automatische Wiederherstellung ist fehlgeschlagen." >&2
  return 1
}

handle_error() {
  local status=$?
  trap - ERR
  if [[ "$service_stopped" == "true" || -n "$backup_file" ]]; then
    restore_previous_version || true
  fi
  echo "Update abgebrochen. Sicherungen liegen in: $backup_directory" >&2
  exit "$status"
}
trap handle_error ERR

command -v docker >/dev/null
docker info >/dev/null
mkdir -p -- "$data_directory" "$backup_directory"

container_id="$(docker compose ps -q family-planner)"
if [[ -z "$container_id" ]]; then
  echo "Der Familienplaner läuft noch nicht. Bitte zuerst starten." >&2
  exit 1
fi
previous_image_id="$(docker inspect --format '{{.Image}}' "$container_id")"

if [[ "${1:-}" != "--skip-pull" && -d .git ]]; then
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo "Lokale Änderungen an Programmdateien gefunden. Update sicherheitshalber abgebrochen." >&2
    exit 1
  fi
  echo "1/6 Neue Programmversion abrufen ..."
  git pull --ff-only
else
  echo "1/6 Git-Aktualisierung übersprungen."
fi

expected_version="$(node -p "require('./package.json').version")"
if [[ -z "$expected_version" ]]; then
  echo "Die Versionsnummer der neuen Programmversion konnte nicht gelesen werden." >&2
  exit 1
fi

echo "2/6 Bisherige Version für eine Rückkehr sichern ..."
docker tag "$previous_image_id" "$rollback_image"

echo "3/6 Neue Version bauen, während die App weiterläuft ..."
docker compose build --pull family-planner

echo "4/6 App kurz anhalten und konsistente Sicherung erstellen ..."
docker compose stop family-planner
service_stopped="true"
docker compose run --rm --no-deps family-planner node server/backup.js
for candidate in "$backup_directory"/*.sqlite; do
  [[ -e "$candidate" ]] || continue
  if [[ -z "$backup_file" || "$candidate" -nt "$backup_file" ]]; then
    backup_file="$candidate"
  fi
done
if [[ -z "$backup_file" || ! -f "$backup_file.manifest.json" ]]; then
  echo "Sicherung oder Prüfmanifest wurde nicht gefunden." >&2
  exit 1
fi
container_backup="/app/backups/$(basename "$backup_file")"
docker compose run --rm --no-deps family-planner \
  node server/updateSimulation.js --database "$container_backup"

echo "5/6 Neue Version starten ..."
docker compose up -d --no-build --remove-orphans
service_stopped="false"
if ! wait_for_planner 40 "$expected_version"; then
  docker compose logs --tail 100 family-planner
  false
fi

echo "6/6 Familieninhalte und Einstellungen vergleichen ..."
container_manifest="/app/backups/$(basename "$backup_file").manifest.json"
docker compose exec -T family-planner \
  node server/dataIntegrity.js --compare "$container_manifest"

trap - ERR
echo
echo "Update erfolgreich."
echo "Version: $expected_version"
echo "Sicherung: $backup_file"
