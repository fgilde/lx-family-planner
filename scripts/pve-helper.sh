#!/usr/bin/env bash
set -Eeuo pipefail

# LX Family Planner - Proxmox VE LXC helper
# Run this script as root in the Proxmox VE host shell.
# Source: https://github.com/laxxx-lab/lx-family-planner

readonly APP_NAME="LX Family Planner"
readonly REPOSITORY_URL_DEFAULT="https://github.com/laxxx-lab/lx-family-planner.git"
readonly RAW_BASE_DEFAULT="https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main"

created_container="false"
CTID="${CTID:-}"
PVE_DRY_RUN="${PVE_DRY_RUN:-false}"

green=$'\033[1;32m'
yellow=$'\033[1;33m'
red=$'\033[1;31m'
blue=$'\033[1;34m'
reset=$'\033[0m'

info() {
  printf '%sℹ  %s%s\n' "$blue" "$*" "$reset"
}

success() {
  printf '%s✔  %s%s\n' "$green" "$*" "$reset"
}

warning() {
  printf '%s⚠  %s%s\n' "$yellow" "$*" "$reset"
}

die() {
  printf '%s✖  %s%s\n' "$red" "$*" "$reset" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  printf '\n%sDie Installation wurde in Zeile %s abgebrochen.%s\n' \
    "$red" "${BASH_LINENO[0]:-?}" "$reset" >&2
  if [[ "$created_container" == "true" && -n "$CTID" ]]; then
    warning "Container $CTID bleibt zur sicheren Diagnose erhalten und wurde nicht automatisch gelöscht."
    printf "   Konsole öffnen: pct enter %s\n" "$CTID" >&2
  fi
  exit "$exit_code"
}
trap on_error ERR

show_usage() {
  cat <<'EOF'
LX Family Planner – Proxmox VE Helper

Auf dem Proxmox-Host als root ausführen:
  bash pve-helper.sh

Optionen:
  --dry-run          PVE-Konfiguration prüfen, aber keinen Container erstellen
  --non-interactive  Ohne Rückfragen mit Standardwerten oder Umgebungsvariablen
  --help             Diese Hilfe anzeigen

Wichtige Umgebungsvariablen:
  CTID, HOSTNAME, CORES, MEMORY, SWAP, DISK_SIZE
  STORAGE, TEMPLATE_STORAGE, BRIDGE, IP_CONFIG, GATEWAY
  HOST_PORT, TIMEZONE, PUBLIC_APP_URL
EOF
}

parse_arguments() {
  local argument
  for argument in "$@"; do
    case "$argument" in
      --dry-run)
        PVE_DRY_RUN="true"
        ;;
      --non-interactive)
        PVE_NONINTERACTIVE="true"
        ;;
      --help|-h)
        show_usage
        exit 0
        ;;
      *)
        die "Unbekannte Option: $argument"
        ;;
    esac
  done
}

require_root_and_pve() {
  [[ "${EUID:-$(id -u)}" -eq 0 ]] ||
    die "Dieses Skript muss als root in der Proxmox-VE-Shell laufen."
  command -v pveversion >/dev/null 2>&1 ||
    die "Proxmox VE wurde nicht erkannt."
  command -v pct >/dev/null 2>&1 ||
    die "Das Proxmox Container Toolkit (pct) fehlt."
  command -v pvesm >/dev/null 2>&1 ||
    die "Die Proxmox-Speicherverwaltung (pvesm) fehlt."
  command -v pveam >/dev/null 2>&1 ||
    die "Die Proxmox-Appliance-Verwaltung (pveam) fehlt."
  command -v pvesh >/dev/null 2>&1 ||
    die "Die Proxmox-API-Shell (pvesh) fehlt."

  local pve_major
  pve_major="$(pveversion | sed -n 's/.*pve-manager\/\([0-9]\+\).*/\1/p')"
  [[ "$pve_major" =~ ^[0-9]+$ && "$pve_major" -ge 8 ]] ||
    die "Benötigt wird Proxmox VE 8.4 oder neuer."
}

first_active_storage() {
  local content_type="$1"
  pvesm status -content "$content_type" 2>/dev/null |
    awk 'NR > 1 && $3 == "active" { print $1; exit }'
}

prompt_value() {
  local variable_name="$1"
  local label="$2"
  local default_value="$3"
  local value=""
  read -r -p "$label [$default_value]: " value
  printf -v "$variable_name" '%s' "${value:-$default_value}"
}

validate_settings() {
  [[ "$CTID" =~ ^[1-9][0-9]{2,8}$ ]] ||
    die "Die Container-ID ist ungültig: $CTID"
  pct status "$CTID" >/dev/null 2>&1 &&
    die "Container-ID $CTID ist bereits vergeben."
  [[ "$HOSTNAME" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]{0,62}$ ]] ||
    die "Der Hostname ist ungültig: $HOSTNAME"
  [[ "$CORES" =~ ^[1-9][0-9]*$ ]] || die "CPU-Anzahl ist ungültig."
  [[ "$MEMORY" =~ ^[1-9][0-9]*$ && "$MEMORY" -ge 1024 ]] ||
    die "Für den Docker-Build werden mindestens 1024 MB RAM benötigt."
  [[ "$SWAP" =~ ^[0-9]+$ ]] || die "Swap-Angabe ist ungültig."
  [[ "$DISK_SIZE" =~ ^[1-9][0-9]*$ && "$DISK_SIZE" -ge 6 ]] ||
    die "Für Anwendung, Docker-Images und Backups werden mindestens 6 GB benötigt."
  [[ "$HOST_PORT" =~ ^[0-9]+$ && "$HOST_PORT" -ge 1 && "$HOST_PORT" -le 65535 ]] ||
    die "Port muss zwischen 1 und 65535 liegen."
  pvesm status -content rootdir 2>/dev/null |
    awk 'NR > 1 && $3 == "active" { print $1 }' |
    grep -Fxq "$STORAGE" ||
    die "Speicher '$STORAGE' ist nicht aktiv oder unterstützt keine Container."
  pvesm status -content vztmpl 2>/dev/null |
    awk 'NR > 1 && $3 == "active" { print $1 }' |
    grep -Fxq "$TEMPLATE_STORAGE" ||
    die "Template-Speicher '$TEMPLATE_STORAGE' ist nicht verfügbar."
  ip link show "$BRIDGE" >/dev/null 2>&1 ||
    die "Netzwerk-Bridge '$BRIDGE' wurde nicht gefunden."
  if [[ "$IP_CONFIG" != "dhcp" ]]; then
    [[ "$IP_CONFIG" =~ ^[0-9a-fA-F:.]+/[0-9]{1,3}$ ]] ||
      die "Statische IP bitte als CIDR angeben, z. B. 192.168.1.50/24."
    [[ -n "$GATEWAY" ]] ||
      die "Für eine statische IP wird ein Gateway benötigt."
  fi
  if [[ -n "$PUBLIC_APP_URL" ]]; then
    [[ "$PUBLIC_APP_URL" =~ ^https?://[^[:space:]]+$ ]] ||
      die "Die öffentliche Adresse muss mit http:// oder https:// beginnen."
    PUBLIC_APP_URL="${PUBLIC_APP_URL%/}"
  fi
}

configure() {
  CTID="${CTID:-$(pvesh get /cluster/nextid)}"
  HOSTNAME="${HOSTNAME:-lx-family}"
  CORES="${CORES:-2}"
  MEMORY="${MEMORY:-2048}"
  SWAP="${SWAP:-512}"
  DISK_SIZE="${DISK_SIZE:-8}"
  STORAGE="${STORAGE:-$(first_active_storage rootdir)}"
  TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-$(first_active_storage vztmpl)}"
  BRIDGE="${BRIDGE:-vmbr0}"
  IP_CONFIG="${IP_CONFIG:-dhcp}"
  GATEWAY="${GATEWAY:-}"
  HOST_PORT="${HOST_PORT:-3001}"
  TIMEZONE="${TIMEZONE:-Europe/Berlin}"
  PUBLIC_APP_URL="${PUBLIC_APP_URL:-}"
  REPOSITORY_URL="${REPOSITORY_URL:-$REPOSITORY_URL_DEFAULT}"
  REPOSITORY_BRANCH="${REPOSITORY_BRANCH:-main}"
  RAW_BASE_URL="${RAW_BASE_URL:-$RAW_BASE_DEFAULT}"

  if [[ -t 0 && "${PVE_NONINTERACTIVE:-false}" != "true" ]]; then
    printf '\n%s%s – Proxmox-Installation%s\n\n' \
      "$green" "$APP_NAME" "$reset"
    printf "1) Standard: 2 CPU, 2 GB RAM, 8 GB, DHCP\n"
    printf "2) Erweitert: Werte selbst festlegen\n\n"
    local mode=""
    read -r -p "Auswahl [1]: " mode
    if [[ "${mode:-1}" == "2" ]]; then
      prompt_value CTID "Container-ID" "$CTID"
      prompt_value HOSTNAME "Hostname" "$HOSTNAME"
      prompt_value CORES "CPU-Kerne" "$CORES"
      prompt_value MEMORY "RAM in MB" "$MEMORY"
      prompt_value SWAP "Swap in MB" "$SWAP"
      prompt_value DISK_SIZE "Festplatte in GB" "$DISK_SIZE"
      prompt_value STORAGE "Container-Speicher" "$STORAGE"
      prompt_value TEMPLATE_STORAGE "Template-Speicher" "$TEMPLATE_STORAGE"
      prompt_value BRIDGE "Netzwerk-Bridge" "$BRIDGE"
      prompt_value IP_CONFIG "IPv4: dhcp oder Adresse/CIDR" "$IP_CONFIG"
      if [[ "$IP_CONFIG" != "dhcp" ]]; then
        prompt_value GATEWAY "IPv4-Gateway" "${GATEWAY:-192.168.1.1}"
      fi
      prompt_value HOST_PORT "LX-Port im Heimnetz" "$HOST_PORT"
    fi
    local public_url_input=""
    read -r -p "Öffentliche LX-Adresse (optional, z. B. https://familie.example.de): " public_url_input
    PUBLIC_APP_URL="${public_url_input:-$PUBLIC_APP_URL}"
  fi

  [[ -n "$STORAGE" ]] || die "Kein aktiver Container-Speicher gefunden."
  [[ -n "$TEMPLATE_STORAGE" ]] || die "Kein aktiver Template-Speicher gefunden."
  validate_settings
}

print_plan() {
  printf '\nGeplante Installation:\n'
  printf '  Container:  %s (%s)\n' "$CTID" "$HOSTNAME"
  printf '  Ressourcen: %s CPU, %s MB RAM, %s GB auf %s\n' \
    "$CORES" "$MEMORY" "$DISK_SIZE" "$STORAGE"
  printf '  Netzwerk:   %s über %s, LX-Port %s\n' \
    "$IP_CONFIG" "$BRIDGE" "$HOST_PORT"
  printf '  Sicherheit: unprivilegierter LXC, kein SSH, kein Docker-TCP-Port\n'
  [[ -z "$PUBLIC_APP_URL" ]] ||
    printf '  Öffentlich: %s\n' "$PUBLIC_APP_URL"
  printf '\n'
}

confirm_installation() {
  print_plan
  if [[ "$PVE_DRY_RUN" == "true" ]]; then
    success "Trockenlauf beendet. Es wurde kein Container erstellt."
    exit 0
  fi
  [[ -t 0 && "${PVE_NONINTERACTIVE:-false}" != "true" ]] || return
  local answer=""
  read -r -p "Container jetzt erstellen? [J/n]: " answer
  if [[ "${answer,,}" =~ ^(n|nein|no)$ ]]; then
    warning "Installation wurde ohne Änderungen abgebrochen."
    exit 0
  fi
}

select_template() {
  local architecture
  architecture="$(dpkg --print-architecture)"
  local template=""

  template="$(
    pveam list "$TEMPLATE_STORAGE" 2>/dev/null |
      awk -v arch="$architecture" '
        $1 ~ ("debian-(13|12)-standard_.*_" arch "\\.tar\\.(zst|gz)$") {
          print $1
        }
      ' |
      sort -V |
      tail -n 1
  )"
  if [[ -n "$template" ]]; then
    printf '%s' "$template"
    return
  fi

  info "Debian-Template-Liste wird aktualisiert …" >&2
  pveam update >/dev/null
  local template_name
  template_name="$(
    pveam available --section system |
      awk -v arch="$architecture" '
        $2 ~ ("debian-(13|12)-standard_.*_" arch "\\.tar\\.(zst|gz)$") {
          print $2
        }
      ' |
      sort -V |
      tail -n 1
  )"
  [[ -n "$template_name" ]] ||
    die "Kein passendes Debian-12/13-Template für $architecture gefunden."

  info "Debian-Template $template_name wird geladen …" >&2
  pveam download "$TEMPLATE_STORAGE" "$template_name" >/dev/null
  printf '%s:vztmpl/%s' "$TEMPLATE_STORAGE" "$template_name"
}

create_container() {
  local template="$1"
  local net0="name=eth0,bridge=${BRIDGE},ip=${IP_CONFIG},ip6=auto,firewall=1"
  if [[ "$IP_CONFIG" != "dhcp" ]]; then
    net0+=",gw=${GATEWAY}"
  fi

  info "Unprivilegierter Debian-LXC $CTID wird erstellt …"
  pct create "$CTID" "$template" \
    --hostname "$HOSTNAME" \
    --ostype debian \
    --arch "$(dpkg --print-architecture)" \
    --cores "$CORES" \
    --memory "$MEMORY" \
    --swap "$SWAP" \
    --rootfs "${STORAGE}:${DISK_SIZE}" \
    --net0 "$net0" \
    --features "nesting=1,keyctl=1" \
    --unprivileged 1 \
    --onboot 1 \
    --startup "order=30,up=30" \
    --tags "family;docker;lx" \
    --description "LX Family Planner – verwaltet mit dem PVE-Helper" \
    --timezone host \
    --start 1
  created_container="true"
  success "Container $CTID wurde erstellt und gestartet."
}

wait_for_network() {
  info "Warte auf Netzwerk und DNS im Container …"
  for _ in $(seq 1 60); do
    if pct exec "$CTID" -- getent hosts github.com >/dev/null 2>&1; then
      success "Netzwerk ist bereit."
      return
    fi
    sleep 2
  done
  die "Der Container hat nach zwei Minuten noch keine funktionierende Netzwerkverbindung."
}

install_application() {
  info "Grundpakete werden im Container vorbereitet …"
  pct exec "$CTID" -- bash -lc \
    "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq; apt-get install -y -qq ca-certificates curl"

  local guest_installer="/tmp/lx-family-pve-guest-install.sh"
  pct exec "$CTID" -- curl -fsSL \
    "${RAW_BASE_URL}/scripts/pve-guest-install.sh" \
    -o "$guest_installer"
  pct exec "$CTID" -- chmod 700 "$guest_installer"

  info "$APP_NAME und Docker werden installiert …"
  pct exec "$CTID" -- env \
    "LX_REPOSITORY_URL=$REPOSITORY_URL" \
    "LX_REPOSITORY_BRANCH=$REPOSITORY_BRANCH" \
    "LX_PUBLIC_APP_URL=$PUBLIC_APP_URL" \
    "LX_HOST_PORT=$HOST_PORT" \
    "LX_TIMEZONE=$TIMEZONE" \
    bash "$guest_installer"
  pct exec "$CTID" -- rm -f "$guest_installer"
}

show_result() {
  local ip_address
  ip_address="$(
    pct exec "$CTID" -- hostname -I 2>/dev/null |
      tr ' ' '\n' |
      awk '/^[0-9]+\./ { print; exit }'
  )"
  local local_url="http://${ip_address:-CONTAINER-IP}:${HOST_PORT}"

  printf '\n%s╭────────────────────────────────────────────────────╮%s\n' "$green" "$reset"
  printf '%s│  LX Family Planner wurde erfolgreich installiert. │%s\n' "$green" "$reset"
  printf '%s╰────────────────────────────────────────────────────╯%s\n\n' "$green" "$reset"
  printf "Container:  %s (%s)\n" "$CTID" "$HOSTNAME"
  printf "Adresse:    %s\n" "$local_url"
  if [[ -n "$PUBLIC_APP_URL" ]]; then
    printf "Öffentlich: %s\n" "$PUBLIC_APP_URL"
  fi
  printf "\nVerwaltung im Container:\n"
  printf "  pct enter %s\n" "$CTID"
  printf "  lx-family status|update|backup|logs|restart|domain|doctor\n\n"
  warning "Nach der ersten Anmeldung ein starkes Familienpasswort vergeben."
  warning "Den Container zusätzlich über die Proxmox-Backupplanung sichern."
}

main() {
  parse_arguments "$@"
  require_root_and_pve
  configure
  confirm_installation
  local template
  template="$(select_template)"
  create_container "$template"
  wait_for_network
  install_application
  show_result
}

main "$@"
