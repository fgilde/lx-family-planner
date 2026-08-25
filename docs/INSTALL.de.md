# LX Family installieren

LX Family läuft auf eurem eigenen Server. Es gibt keinen zentralen LX-Account,
keine gemeinsame Familien-Datenbank und keine verpflichtende Cloud. Wählt den
passenden Weg, öffnet danach LX im Browser und legt die erste Familie im
geführten Onboarding an.

## Den passenden Weg wählen

| Plattform | Geeignet für | Verfügbarkeit | Anleitung |
| --- | --- | --- | --- |
| Docker Compose | Server, NAS, Mini-PC oder VM | sofort verfügbar | [Docker Compose](#docker-compose) |
| Proxmox VE | eigener nativer LXC | sofort verfügbar | [Proxmox VE](#proxmox-ve-nativer-lxc) |
| Windows + Docker Desktop | Windows-Heimserver | sofort verfügbar | [Windows](#windows-mit-docker-desktop) |
| Node.js | vorhandener Node-22-Server | sofort verfügbar | [Node.js](#ohne-docker-mit-nodejs) |
| Unraid, Umbrel, CasaOS, Cosmos | Heimserver mit App-Store | Pakete werden geprüft | [App-Stores](#pakete-für-app-stores) |

Danach `http://SERVER-IP:3001` öffnen. Die erste Familie legt ihr eigenes
Passwort an; anschließend schließt der Server die öffentliche Registrierung
standardmäßig. Die Android-App verbindet ihr anschließend mit derselben
eigenen Serveradresse.

## Docker Compose

Der empfohlene Weg für die meisten Heimserver. Daten liegen in `data/`, die
drei neuesten lokalen Sicherungen in `backups/` neben der Compose-Datei.

```bash
git clone https://github.com/laxxx-lab/lx-family-planner.git
cd lx-family-planner
cp .env.example .env
sed -i "s/^APP_SECRET=.*/APP_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d --build
```

Danach `http://SERVER-IP:3001` öffnen und den Assistenten abschließen.

Für Updates bitte den geschützten Updater verwenden:

```bash
bash scripts/docker-update.sh
```

Er erstellt eine Sicherung, probiert Migrationen auf einer Kopie aus, prüft
die Daten und stellt bei einem Fehler die vorherige Version wieder her.

### Datenbank sichern und wiederherstellen

Eine konsistente SQLite-Sicherung lässt sich jederzeit erzeugen:

```bash
docker compose exec -T family-planner node server/backup.js
```

Die Datei und ihr Prüfmanifest liegen anschließend in `backups/`. Für eine
Wiederherstellung niemals nur die `.sqlite`-Datei über eine laufende Datenbank
kopieren: SQLite kann zusätzlich geöffnete `-wal`- und `-shm`-Dateien halten.
Der geführte Restore hält LX an, prüft Manifest, Dateihash und SQLite-Inhalt,
erstellt eine zusätzliche Sicherung des aktuellen Zustands und entfernt die
alten WAL-Dateien kontrolliert:

```bash
bash scripts/docker-restore.sh
```

Ohne Dateinamen wird die neueste Sicherung verwendet. Eine bestimmte
Sicherung kann über ihren Namen aus `backups/` ausgewählt werden:

```bash
bash scripts/docker-restore.sh family-planner-2026-08-25T12-00-00-000Z.sqlite
```

Unter Windows steht dafür `Restore-Familienplaner.cmd` bereit; der optionale
Dateiname kann in einer Eingabeaufforderung als Argument übergeben werden.

Die Eigentümerfamilie der Installation kann dieselben geprüften Sicherungen in
der **Elternzentrale → Datenbanksicherungen** verwalten. Dort lassen sich ein
täglicher oder wöchentlicher Zeitplan, Uhrzeit und Aufbewahrung einstellen. Ein
verpasster Lauf wird beim nächsten Serverstart nachgeholt. Beim Zurückspielen
werden Familienpasswort und die ausdrückliche Eingabe `WIEDERHERSTELLEN`
verlangt; anschließend beendet sich LX mit einem Neustartcode. Die unterstützten
Docker-Installationen starten den Dienst automatisch wieder. Bei einem direkt
mit `npm start` gestarteten Server muss LX danach manuell neu gestartet werden.

Ohne `INSTANCE_OWNER_FAMILY_ID` gilt die zuerst angelegte Familie als
Eigentümerfamilie. Mehrfamilien-Installationen können stattdessen die gewünschte
Familien-ID ausdrücklich über diese Umgebungsvariable festlegen. Andere
Familien können die vollständige Instanzdatenbank weder sehen noch zurücksetzen.

## Proxmox VE: nativer LXC

Diesen Befehl **als `root` in der Proxmox-Host-Shell** ausführen, nicht in
einem bestehenden Container:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main/scripts/proxmox-lxc.sh)"
```

Der getestete Installer erzeugt einen neuen unprivilegierten Debian-13-LXC mit
zwei CPU-Kernen, 2 GB RAM und 8 GB Speicher. Darin richtet er die offizielle
Docker Engine ein und startet LX Family auf Port `3001`.

Hat das Proxmox-Netz kein DHCP, im erweiterten Netzwerkdialog eine feste IP
eintragen. Danach die angezeigte Adresse `http://LXC-IP:3001` öffnen.

### Manuell ohne den Proxmox-Helper

Wer den LXC lieber selbst anlegt, erstellt in Proxmox einen **unprivilegierten
Debian-13-LXC** mit mindestens 2 CPU-Kernen, 2 GB RAM, 8 GB Speicher und den
Features **Nesting** sowie **Keyctl**. Anschließend in der LXC-Konsole als
`root` ausführen:

```bash
apt-get update && apt-get install -y ca-certificates curl
bash -c "$(curl -fsSL https://raw.githubusercontent.com/laxxx-lab/lx-family-planner/main/scripts/pve-guest-install.sh)"
```

Das richtet Docker ein, lädt LX Family aus dem offiziellen Repository und
startet die Anwendung. Danach `http://LXC-IP:3001` öffnen.

## Windows mit Docker Desktop

Repository klonen oder entpacken, Docker Desktop starten und dann doppelt
klicken:

```text
Start-Familienplaner.cmd
```

Lokal läuft LX unter `http://localhost:3001`, andere Geräte im Heimnetz nutzen
`http://SERVER-IP:3001`. Falls nötig einmal `Heimnetz-Freigabe.cmd` als
Administrator ausführen; sie gibt den Port ausschließlich im privaten Netzwerk
frei.

## Ohne Docker mit Node.js

Für einen bestehenden Server mit Node.js **22.13 oder neuer**:

```bash
git clone https://github.com/laxxx-lab/lx-family-planner.git
cd lx-family-planner
npm ci
cp .env.example .env
npm run build
npm start
```

Für Zugriff über eine eigene Domain einen eigenen Reverse Proxy verwenden und
`PUBLIC_APP_URL` auf diese Adresse setzen. Details für Heimnetz, HTTPS,
Android und Proxy stehen unter [Selbst hosten](SELF_HOSTING.md).

## Pakete für App-Stores

LX Family ist für **Unraid Community Applications, Umbrel, CasaOS und Cosmos**
vorbereitet. Alle nutzen dasselbe Multi-Architektur-Image und bewahren
`/app/data` sowie `/app/backups` bei Updates. Bis ein Store LX Family sichtbar
listet, ist Docker Compose oben der unterstützte Installationsweg.

- [Unraid-Einreichung](https://ca.unraid.net/submissions)
- [Umbrel-Prüfung](https://github.com/getumbrel/umbrel-apps/pull/5939)
- [CasaOS-Prüfung](https://github.com/IceWhaleTech/CasaOS-AppStore/pull/999)
- [Cosmos-Prüfung](https://github.com/azukaar/cosmos-servapps-official/pull/267)

## Zugriff aus dem Internet

Eine eigene HTTPS-Domain mit Reverse Proxy einrichten und danach nur die eigene
Adresse hinterlegen:

```env
PUBLIC_APP_URL=https://familie.example.de
TRUST_PROXY=1
```

Öffentliche Registrierung und ein öffentliches Familienverzeichnis nur bewusst
aktivieren. `.env`, `APP_SECRET`, `data/` und `backups/` bleiben privat. Die
vollständige Betriebsanleitung steht unter [SELF_HOSTING.md](SELF_HOSTING.md).
