#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
lock_file="/run/lock/lx-family-planner-auto-update.lock"
check_only="false"

usage() {
  cat <<'EOF'
LX Family Planner – sichere automatische Updates

Verwendung:
  bash scripts/docker-auto-update.sh
  bash scripts/docker-auto-update.sh --check

Ohne Option wird ausschließlich das neueste veröffentlichte stabile GitHub-
Release installiert. --check meldet nur, ob eine neuere Version vorliegt.
EOF
}

case "${1:-}" in
  "")
    ;;
  --check)
    check_only="true"
    ;;
  --help|-h)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

if [[ "${LX_FAMILY_AUTO_UPDATE_LOCKED:-}" != "1" ]]; then
  mkdir -p -- "$(dirname "$lock_file")"
  exec flock -n "$lock_file" \
    env LX_FAMILY_AUTO_UPDATE_LOCKED=1 \
    bash "$0" "$@"
fi

cd "$project_root"

command -v curl >/dev/null
command -v docker >/dev/null
command -v git >/dev/null
command -v sort >/dev/null
docker info >/dev/null

if [[ ! -d .git ]]; then
  echo "Automatische Updates benötigen die Git-Installation von LX." >&2
  exit 1
fi

if [[ "$(git symbolic-ref --quiet --short HEAD || true)" != "main" ]]; then
  echo "Automatische Updates laufen ausschließlich auf dem main-Branch." >&2
  exit 1
fi

container_id="$(docker compose ps -q family-planner)"
if [[ -z "$container_id" ]]; then
  echo "Der LX Family Planner läuft nicht." >&2
  exit 1
fi

current_version="$(
  docker compose exec -T family-planner node -e \
    "fetch('http://127.0.0.1:3001/api/health').then(async response=>{const health=await response.json();if(!response.ok||!health.success||!health.version)process.exit(1);console.log(health.version)}).catch(()=>process.exit(1))"
)"
if [[ ! "$current_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Die laufende LX-Version konnte nicht sicher gelesen werden." >&2
  exit 1
fi

release_json="$(
  curl -fsSL \
    --retry 3 \
    --connect-timeout 10 \
    -H "Accept: application/vnd.github+json" \
    -H "User-Agent: LX-Family-Planner-Auto-Update" \
    "https://api.github.com/repos/laxxx-lab/lx-family-planner/releases/latest"
)"
latest_tag="$(
  grep -oP '"tag_name"\s*:\s*"\K[^"]+' <<< "$release_json" |
    head -n 1
)"
if [[ ! "$latest_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "GitHub hat keine gültige stabile LX-Version gemeldet." >&2
  exit 1
fi
latest_version="${latest_tag#v}"

echo "Installiert: $current_version"
echo "Veröffentlicht: $latest_version"

if [[ "$current_version" == "$latest_version" ]]; then
  echo "LX Family Planner ist aktuell."
  exit 0
fi

newest_version="$(
  printf '%s\n' "$current_version" "$latest_version" |
    sort -V |
    tail -n 1
)"
if [[ "$newest_version" != "$latest_version" ]]; then
  echo "Die installierte Version ist neuer als das stabile Release; keine Änderung."
  exit 0
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Lokale Änderungen an Programmdateien verhindern das Auto-Update." >&2
  exit 1
fi

git fetch --prune origin \
  "refs/heads/main:refs/remotes/origin/main" \
  "refs/tags/${latest_tag}:refs/tags/${latest_tag}"

release_commit="$(git rev-parse "${latest_tag}^{commit}")"
if ! git merge-base --is-ancestor "$release_commit" origin/main; then
  echo "Das veröffentlichte Release gehört nicht zum offiziellen main-Branch." >&2
  exit 1
fi
if ! git merge-base --is-ancestor HEAD "$release_commit"; then
  echo "Der Serverstand lässt sich nicht sicher vorwärts aktualisieren." >&2
  exit 1
fi

if [[ "$check_only" == "true" ]]; then
  echo "Update $latest_version ist verfügbar und kann sicher eingespielt werden."
  exit 0
fi

git merge --ff-only "$release_commit"
bash scripts/docker-update.sh --skip-pull

