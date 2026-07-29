#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_DIR="${LX_APP_DIR:-/opt/lx-family-planner}"
readonly COMPOSE_SERVICE="family-planner"

green=$'\033[1;32m'
yellow=$'\033[1;33m'
red=$'\033[1;31m'
reset=$'\033[0m'

die() {
  printf '%s%s%s\n' "$red" "$*" "$reset" >&2
  exit 1
}

require_installation() {
  [[ "${EUID:-$(id -u)}" -eq 0 ]] ||
    die "Bitte als root ausführen."
  [[ -d "$APP_DIR/.git" && -f "$APP_DIR/compose.yaml" ]] ||
    die "Keine LX-Family-Installation unter $APP_DIR gefunden."
  command -v docker >/dev/null 2>&1 || die "Docker wurde nicht gefunden."
}

run_compose() {
  (
    cd "$APP_DIR"
    docker compose "$@"
  )
}

local_address() {
  local ip_address
  ip_address="$(
    hostname -I 2>/dev/null |
      tr ' ' '\n' |
      awk '/^[0-9]+\./ { print; exit }'
  )"
  local port
  port="$(sed -n 's/^HOST_PORT=//p' "$APP_DIR/.env" | tail -n 1)"
  printf 'http://%s:%s' "${ip_address:-CONTAINER-IP}" "${port:-3001}"
}

host_port() {
  local port
  port="$(sed -n 's/^HOST_PORT=//p' "$APP_DIR/.env" | tail -n 1)"
  printf '%s' "${port:-3001}"
}

show_help() {
  cat <<'EOF'
LX Family Planner – Verwaltung

  lx-family status           Zustand und Version anzeigen
  lx-family update           Sicheres Update mit Backup und Rückfalloption
  lx-family backup           Sofortige Datenbanksicherung erstellen
  lx-family logs             Laufende Protokolle anzeigen
  lx-family restart          Anwendung neu starten
  lx-family stop             Anwendung anhalten
  lx-family start            Anwendung starten
  lx-family domain [URL]     Öffentliche Adresse anzeigen oder setzen
  lx-family nextcloud [URL]  Cloud aktivieren; optional öffentliche HTTPS-URL
  lx-family doctor           Docker, Speicher und API prüfen
  lx-family config           Lokale Einstellungen bearbeiten
  lx-family help             Diese Übersicht anzeigen
EOF
}

show_status() {
  printf '%sLX Family Planner%s\n' "$green" "$reset"
  run_compose ps
  printf "\nAdresse: %s\n" "$(local_address)"
  local public_url
  public_url="$(sed -n 's/^PUBLIC_APP_URL=//p' "$APP_DIR/.env" | tail -n 1)"
  [[ -z "$public_url" ]] || printf "Öffentlich: %s\n" "$public_url"
  local health
  health="$(
    curl -fsS --max-time 5 \
      "http://127.0.0.1:$(host_port)/api/health" 2>/dev/null ||
      true
  )"
  if [[ -n "$health" ]]; then
    printf 'API: %serreichbar%s – %s\n' "$green" "$reset" "$health"
  else
    printf 'API: %snicht erreichbar%s\n' "$red" "$reset"
    return 1
  fi
}

create_backup() {
  printf '%sDatenbanksicherung wird erstellt …%s\n' "$yellow" "$reset"
  run_compose run --rm --no-deps \
    "$COMPOSE_SERVICE" node server/backup.js
}

set_domain() {
  local url="${1:-}"
  if [[ -z "$url" ]]; then
    local current
    current="$(sed -n 's/^PUBLIC_APP_URL=//p' "$APP_DIR/.env" | tail -n 1)"
    printf "Öffentliche Adresse: %s\n" "${current:-nicht gesetzt}"
    printf "Setzen: lx-family domain https://familie.example.de\n"
    return
  fi
  [[ "$url" =~ ^https?://[^[:space:]]+$ ]] ||
    die "Die Adresse muss mit http:// oder https:// beginnen."
  url="${url%/}"

  local temporary_file
  temporary_file="$(mktemp)"
  grep -v '^PUBLIC_APP_URL=' "$APP_DIR/.env" >"$temporary_file" || true
  printf 'PUBLIC_APP_URL=%s\n' "$url" >>"$temporary_file"
  install -m 600 "$temporary_file" "$APP_DIR/.env"
  rm -f "$temporary_file"
  run_compose up -d --no-build --force-recreate "$COMPOSE_SERVICE"
  printf '%sÖffentliche Adresse gesetzt: %s%s\n' "$green" "$url" "$reset"
}

run_doctor() {
  local failed="false"
  printf "Docker Engine: "
  if docker info >/dev/null 2>&1; then
    printf '%sOK%s\n' "$green" "$reset"
  else
    printf '%sFEHLER%s\n' "$red" "$reset"
    failed="true"
  fi

  printf "Compose-Datei: "
  if run_compose config --quiet; then
    printf '%sOK%s\n' "$green" "$reset"
  else
    printf '%sFEHLER%s\n' "$red" "$reset"
    failed="true"
  fi

  printf "LX-API: "
  if curl -fsS --max-time 5 \
    "http://127.0.0.1:$(host_port)/api/health" >/dev/null; then
    printf '%sOK%s\n' "$green" "$reset"
  else
    printf '%sFEHLER%s\n' "$red" "$reset"
    failed="true"
  fi

  printf "\nSpeicher:\n"
  df -h "$APP_DIR" /var/lib/docker
  printf "\nContainer:\n"
  run_compose ps

  [[ "$failed" == "false" ]] ||
    die "Mindestens eine Prüfung ist fehlgeschlagen."
  printf '\n%sAlle Prüfungen waren erfolgreich.%s\n' "$green" "$reset"
}

edit_config() {
  "${EDITOR:-nano}" "$APP_DIR/.env"
  printf "Einstellungen gespeichert. Mit 'lx-family restart' anwenden.\n"
}

main() {
  require_installation
  case "${1:-help}" in
    status)
      show_status
      ;;
    update)
      cd "$APP_DIR"
      bash scripts/docker-update.sh
      ;;
    backup)
      create_backup
      ;;
    logs)
      run_compose logs -f --tail 150 "$COMPOSE_SERVICE"
      ;;
    restart)
      run_compose restart "$COMPOSE_SERVICE"
      show_status
      ;;
    stop)
      run_compose stop "$COMPOSE_SERVICE"
      ;;
    start)
      run_compose up -d --no-build "$COMPOSE_SERVICE"
      show_status
      ;;
    domain)
      set_domain "${2:-}"
      ;;
    nextcloud)
      cd "$APP_DIR"
      bash scripts/nextcloud-enable.sh
      if [[ -n "${2:-}" ]]; then
        bash scripts/nextcloud-public-url.sh "$2"
      fi
      ;;
    doctor)
      run_doctor
      ;;
    config)
      edit_config
      ;;
    help|-h|--help)
      show_help
      ;;
    *)
      show_help
      die "Unbekannter Befehl: $1"
      ;;
  esac
}

main "$@"
