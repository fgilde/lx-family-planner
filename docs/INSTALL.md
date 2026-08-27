# Install LX Family

LX Family runs on hardware you control. There is no LX account, shared family
database or mandatory cloud service. Pick the route that matches your home
server, open LX in a browser and create the first family in guided onboarding.

## Choose your route

| Platform | Best for | Availability | Start here |
| --- | --- | --- | --- |
| Docker Compose | a server, NAS, mini PC or VM | available now | [Docker Compose](#docker-compose) |
| Proxmox VE | a dedicated native LXC | available now | [Proxmox VE](#proxmox-ve-native-lxc) |
| Windows + Docker Desktop | a Windows home server | available now | [Windows](#windows-with-docker-desktop) |
| Plain Node.js | an existing Node.js 22 server | available now | [Node.js](#plain-nodejs) |
| Unraid | an Unraid home server | available in Community Applications | [Unraid app](https://ca.unraid.net/apps/lx-family-planner-1kvgxdh1njii8h) |
| Umbrel, CasaOS, Cosmos | an app-store based home server | packages are being reviewed | [Store packages](#app-store-packages) |

After any installation, open `http://SERVER-IP:3001`. The first family creates
its own password and the server then closes public registration by default.
The Android app connects to the same address you choose for your own server.

## Docker Compose

Recommended for most home servers. It stores application data in `data/` and
the last three local backups in `backups/` next to the Compose file.

```bash
git clone https://github.com/laxxx-lab/lx-family-planner.git
cd lx-family-planner
cp .env.example .env
sed -i "s/^APP_SECRET=.*/APP_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d --build
```

Open `http://SERVER-IP:3001` and complete onboarding.

For an update, use the guarded updater instead of replacing data manually:

```bash
bash scripts/docker-update.sh
```

It creates a backup, tests migrations against a copy, validates data and
restores the previous version if a check fails.

## Proxmox VE: native LXC

Run this **as `root` on the Proxmox host**, not inside an existing container:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main/scripts/proxmox-lxc.sh)"
```

The tested installer creates a new unprivileged Debian 13 LXC with two CPU
cores, 2 GB RAM and 8 GB storage. It installs the official Docker Engine in
the LXC and starts LX Family on port `3001`.

Use the installer’s advanced network settings to provide a static IP when the
Proxmox network has no DHCP. After the installer finishes, open the printed
`http://LXC-IP:3001` address.

### Manual LXC setup without the helper

Create an **unprivileged Debian 13 LXC** in Proxmox with at least 2 CPU cores,
2 GB RAM, 8 GB storage, and the **Nesting** and **Keyctl** features enabled.
Then run this as `root` in the LXC console:

```bash
apt-get update && apt-get install -y ca-certificates curl
bash -c "$(curl -fsSL https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main/scripts/pve-guest-install.sh)"
```

It installs Docker, retrieves LX Family from the official repository and starts
the application. Then open `http://LXC-IP:3001`.

## Windows with Docker Desktop

Clone or extract the repository, start Docker Desktop, then double-click:

```text
Start-Familienplaner.cmd
```

The planner opens locally at `http://localhost:3001`. Other devices on the
same LAN use `http://SERVER-IP:3001`. If needed, run
`Heimnetz-Freigabe.cmd` once as administrator to allow the port on private
networks only.

## Plain Node.js

For an existing server with Node.js **22.13 or newer**:

```bash
git clone https://github.com/laxxx-lab/lx-family-planner.git
cd lx-family-planner
npm ci
cp .env.example .env
npm run build
npm start
```

For a production setup, put LX behind your own reverse proxy and configure
`PUBLIC_APP_URL` to that address. See [self-hosting](SELF_HOSTING.md) for LAN,
HTTPS, Android and proxy guidance.

## App-store packages

LX Family is already available in **Unraid Community Applications**. The
packages for **Umbrel, CasaOS and Cosmos** use the same published
multi-architecture container image and preserve `/app/data` and `/app/backups`,
but still await manual store review. Until a store lists LX Family, Docker
Compose above is the supported install path.

- [Unraid app](https://ca.unraid.net/apps/lx-family-planner-1kvgxdh1njii8h)
- [Umbrel review](https://github.com/getumbrel/umbrel-apps/pull/5939)
- [CasaOS review](https://github.com/IceWhaleTech/CasaOS-AppStore/pull/999)
- [Cosmos review](https://github.com/azukaar/cosmos-servapps-official/pull/267)

## Before you expose LX to the internet

Use your own HTTPS domain and reverse proxy, then set:

```env
PUBLIC_APP_URL=https://family.example.net
TRUST_PROXY=1
```

Do not enable public registration or a public family directory unless that is
explicitly intended. Keep `.env`, `APP_SECRET`, `data/` and `backups/` private.
The full operational guide is [SELF_HOSTING.md](SELF_HOSTING.md).
