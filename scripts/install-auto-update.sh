#!/usr/bin/env bash
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
service_template="$project_root/deploy/systemd/lx-family-planner-auto-update.service"
timer_template="$project_root/deploy/systemd/lx-family-planner-auto-update.timer"
service_target="/etc/systemd/system/lx-family-planner-auto-update.service"
timer_target="/etc/systemd/system/lx-family-planner-auto-update.timer"
run_now="false"

usage() {
  cat <<'EOF'
Installiert die kontrollierten automatischen LX-Updates unter systemd.

Verwendung:
  sudo bash scripts/install-auto-update.sh
  sudo bash scripts/install-auto-update.sh --run-now
EOF
}

case "${1:-}" in
  "")
    ;;
  --run-now)
    run_now="true"
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

if [[ "$EUID" -ne 0 ]]; then
  echo "Die Einrichtung benötigt root-Rechte." >&2
  exit 1
fi

command -v systemctl >/dev/null
command -v sed >/dev/null
test -f "$service_template"
test -f "$timer_template"
test -f "$project_root/scripts/docker-auto-update.sh"

temporary_service="$(mktemp)"
trap 'rm -f "$temporary_service"' EXIT
escaped_project_root="${project_root//&/\\&}"
escaped_project_root="${escaped_project_root//|/\\|}"
sed "s|@@PROJECT_ROOT@@|${escaped_project_root}|g" \
  "$service_template" > "$temporary_service"

install -m 0644 "$temporary_service" "$service_target"
install -m 0644 "$timer_template" "$timer_target"
systemctl daemon-reload
systemctl enable --now lx-family-planner-auto-update.timer

if [[ "$run_now" == "true" ]]; then
  systemctl start lx-family-planner-auto-update.service
fi

echo "Automatische LX-Updates sind aktiv."
systemctl list-timers lx-family-planner-auto-update.timer --no-pager

