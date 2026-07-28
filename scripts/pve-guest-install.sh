#!/usr/bin/env bash
set -Eeuo pipefail

# Runs inside the Debian LXC created by scripts/pve-helper.sh.

readonly APP_DIR="${LX_APP_DIR:-/opt/lx-family-planner}"
readonly REPOSITORY_URL="${LX_REPOSITORY_URL:-https://github.com/laxxx-lab/lx-family-planner.git}"
readonly REPOSITORY_BRANCH="${LX_REPOSITORY_BRANCH:-main}"
readonly HOST_PORT="${LX_HOST_PORT:-3001}"
readonly TIMEZONE="${LX_TIMEZONE:-Europe/Berlin}"
readonly PUBLIC_APP_URL="${LX_PUBLIC_APP_URL:-}"

export DEBIAN_FRONTEND=noninteractive

die() {
  printf "LX Family Planner: %s\n" "$*" >&2
  exit 1
}

[[ "${EUID:-$(id -u)}" -eq 0 ]] ||
  die "Die Installation im LXC benötigt root-Rechte."
[[ -r /etc/os-release ]] || die "Debian konnte nicht erkannt werden."

# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == "debian" ]] ||
  die "Dieser Installer unterstützt Debian 12 und 13."
[[ "${VERSION_ID:-}" =~ ^(12|13)$ ]] ||
  die "Dieser Installer unterstützt Debian 12 und 13."
[[ "$HOST_PORT" =~ ^[0-9]+$ && "$HOST_PORT" -ge 1 && "$HOST_PORT" -le 65535 ]] ||
  die "Der konfigurierte Port ist ungültig."
if [[ -n "$PUBLIC_APP_URL" && ! "$PUBLIC_APP_URL" =~ ^https?://[^[:space:]]+$ ]]; then
  die "LX_PUBLIC_APP_URL muss mit http:// oder https:// beginnen."
fi

printf "Pakete und Zeitzone werden eingerichtet …\n"
apt-get update -qq
apt-get install -y -qq \
  ca-certificates \
  curl \
  git \
  gnupg \
  nano \
  openssl
ln -snf "/usr/share/zoneinfo/$TIMEZONE" /etc/localtime
printf '%s\n' "$TIMEZONE" >/etc/timezone

if ! command -v docker >/dev/null 2>&1; then
  printf "Docker Engine wird aus dem offiziellen Debian-Repository installiert …\n"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: ${VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
  apt-get update -qq
  apt-get install -y -qq \
    containerd.io \
    docker-buildx-plugin \
    docker-ce \
    docker-ce-cli \
    docker-compose-plugin
fi
systemctl enable --now docker
docker info >/dev/null
docker compose version >/dev/null

if [[ -e "$APP_DIR" ]]; then
  die "$APP_DIR existiert bereits. Eine bestehende Installation wird nicht überschrieben."
fi

printf "LX Family Planner wird geladen …\n"
git clone --depth 1 --branch "$REPOSITORY_BRANCH" \
  "$REPOSITORY_URL" "$APP_DIR"

app_secret="$(openssl rand -hex 48)"
umask 077
{
  printf 'APP_SECRET=%s\n' "$app_secret"
  printf 'PORT=3001\n'
  printf 'HOST_PORT=%s\n' "$HOST_PORT"
  printf 'TZ=%s\n' "$TIMEZONE"
  printf 'SESSION_COOKIE_SECURE=auto\n'
  if [[ -n "$PUBLIC_APP_URL" ]]; then
    printf 'PUBLIC_APP_URL=%s\n' "${PUBLIC_APP_URL%/}"
  fi
} >"$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
unset app_secret

printf "Produktionscontainer wird gebaut und gestartet …\n"
cd "$APP_DIR"
docker compose build --pull family-planner
docker compose up -d --no-build --remove-orphans

expected_version="$(
  sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' \
    package.json |
    head -n 1
)"
[[ -n "$expected_version" ]] ||
  die "Die LX-Versionsnummer konnte nicht gelesen werden."
for attempt in $(seq 1 60); do
  if docker compose exec -T \
    -e "EXPECTED_VERSION=$expected_version" \
    family-planner node -e \
    "fetch('http://127.0.0.1:3001/api/health').then(async r=>{const h=await r.json();if(!r.ok||!h.success||(process.env.EXPECTED_VERSION&&h.version!==process.env.EXPECTED_VERSION))process.exit(1)}).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 60 ]]; then
    docker compose logs --tail 100 family-planner
    die "Der Familienplaner wurde nicht rechtzeitig bereit."
  fi
  sleep 2
done

chmod 755 "$APP_DIR/scripts/pve-manage.sh"
ln -s "$APP_DIR/scripts/pve-manage.sh" /usr/local/sbin/lx-family

cat >/etc/update-motd.d/99-lx-family <<'EOF'
#!/usr/bin/env bash
ip_address="$(hostname -I 2>/dev/null | tr ' ' '\n' | awk '/^[0-9]+\./ { print; exit }')"
port="$(sed -n 's/^HOST_PORT=//p' /opt/lx-family-planner/.env 2>/dev/null | tail -n 1)"
printf '\n  LX Family Planner: http://%s:%s\n' "${ip_address:-CONTAINER-IP}" "${port:-3001}"
printf '  Verwaltung:        lx-family help\n\n'
EOF
chmod 755 /etc/update-motd.d/99-lx-family

docker compose exec -T family-planner node server/dataIntegrity.js >/dev/null
printf "LX Family Planner %s ist bereit.\n" "$expected_version"
