#!/usr/bin/env bash
set -Eeuo pipefail

# One-line entry point for the maintained LX Family Proxmox installer.
# Keep this launcher independent of third-party helper internals: their
# build engine and file layout may change without notice.
readonly LX_RAW_ROOT="${LX_RAW_ROOT:-https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main}"

installer="$(curl -fsSL "$LX_RAW_ROOT/scripts/pve-helper.sh")" || {
  echo "LX Family: Der Proxmox-Installer konnte nicht geladen werden." >&2
  exit 1
}
[[ "$installer" == '#!/usr/bin/env bash'* ]] || {
  echo "LX Family: Der geladene Installer ist unvollständig oder ungültig." >&2
  exit 1
}

exec bash -c "$installer"
