<p align="center">
  <img src="public/icon.svg" alt="LX Family Planner" width="92">
</p>

<h1 align="center">LX Family Planner</h1>

<p align="center">
  Der private Familienraum für Kalender, Aufgaben, Einkauf, Essen, Chat und all die kleinen Dinge dazwischen.
</p>

Der LX Family Planner ist eine selbst gehostete Familien-App für das eigene
Heimnetz. Erwachsene bekommen einen ruhigen, vollständigen Überblick. Kinder
sehen eine vereinfachte Erlebniswelt mit Missionen, Sternen und eigenen
Themenwelten. Alle Daten bleiben auf dem eigenen Server.

## Ein Blick in die App

| Waldruhe | Backstage |
| --- | --- |
| ![Erwachsenen-Dashboard im Theme Waldruhe](docs/screenshots/dashboard-waldruhe.jpg) | ![Erwachsenen-Dashboard im Theme Backstage](docs/screenshots/dashboard-backstage.jpg) |

| Kinderprofil | Tablet Mode |
| --- | --- |
| ![Kinderprofil im Raketen-Theme](docs/screenshots/kinderprofil-rakete.jpg) | ![Tablet Mode im Querformat](docs/screenshots/tablet-modus.jpg) |

<details>
<summary>Mobiler Familienchat</summary>

![Familienchat auf einem Smartphone](docs/screenshots/chat-mobil.jpg)

</details>

## Das ist enthalten

- Familienkonten mit Profilen für Mama, Papa, Kind, Oma, Opa und weitere Rollen
- kinderleichte Bubble-Profilauswahl und optionaler Profil-PIN
- Kalender, Müllkalender, ICS-Dateiimport und automatisch aktualisierte
  Kalender-Abos
- gemeinsamer Familienchat und geschützte Direktnachrichten
- Einkaufslisten mit großem, alltagstauglichem Produktkatalog und Bring!-Anbindung
- Wochen-Speiseplan, Rezeptbuch, Rezeptimport und Kochmodus
- Aufgaben, Sterne und Belohnungsshop
- Vier-Augen-Prinzip: Kinder melden eine Aufgabe als erledigt, der Ersteller
  bestätigt sie und erst danach werden Sterne gutgeschrieben
- Pinnwand, Familiennetz und Stammbaum zwischen angemeldeten Familien
- Elternzentrale für Kinderprofile, Aufgaben, Punkte, Medienlinks und Geräte
- eigene Kinderoberfläche mit Raketen-, Einhorn-, Feen-, Dino-, Sonnen- und
  Heldenwelt
- Erwachsenen-Themes von Waldruhe und Küstenruhe bis Backstage und Neon Nacht
- profilgebundene Browser-Benachrichtigungen und optionale Gotify-Anbindung
- dauerhaftes, profilgetrenntes Meldungszentrum mit gelesen/ungelesen
- Familien-Posteingang mit persönlichem Tagesüberblick für Termine, Aufgaben,
  Essen und Einkauf
- wiederkehrende Aufgaben für täglich, werktags, wöchentlich und monatlich
- frei anpassbare Dashboard-Kacheln pro Profil und Gerät mit eigener
  Tablet-Anordnung, Sichtbarkeit und kompakter Ansicht
- eigenständiger Tablet Mode mit acht Kacheln für das Querformat
- responsive Darstellung für PC, Tablet und Smartphone

## Weg 1: Mit Docker starten (empfohlen)

### Einfach unter Windows

Voraussetzung ist eine laufende Installation von Docker Desktop. Danach genügt
ein Doppelklick auf:

```text
Start-Familienplaner.cmd
```

Das Startskript:

1. erzeugt beim ersten Start eine lokale `.env` mit sicherem Anwendungsschlüssel,
2. übernimmt einen vorhandenen Altbestand nach `data/`,
3. baut den Produktions-Container,
4. startet ihn auf Port `3001`.

Auf dem Server-PC ist die App anschließend unter
`http://localhost:3001` erreichbar. Andere Geräte im selben Heimnetz öffnen:

```text
http://IP-DES-SERVERS:3001
```

Beispiel:

```text
http://192.168.178.40:3001
```

Falls Windows Verbindungen aus dem Heimnetz blockiert, kann
`Heimnetz-Freigabe.cmd` einmal als Administrator ausgeführt werden. Das Skript
erlaubt Port `3001` nur in privaten Netzwerken. Eine Portfreigabe am Router ist
für den reinen Heimnetzbetrieb nicht nötig und wird nicht empfohlen.

Weitere Helfer:

- `Update-Familienplaner.cmd` lädt Updates, prüft sie auf einer Kopie der
  Datenbank und spielt sie mit automatischer Rückfallmöglichkeit ein.
- `Stop-Familienplaner.cmd` beendet die App, ohne Daten zu löschen.
- `Backup-Familienplaner.cmd` erzeugt eine konsistente SQLite-Sicherung.
- Ein erneuter Start baut geänderten Programmcode automatisch neu.

### Docker manuell

```powershell
Copy-Item .env.example .env
```

Danach in `.env` mindestens `APP_SECRET` durch einen langen, zufälligen Wert
ersetzen und starten:

```powershell
docker compose up -d --build
```

Status und Protokoll:

```powershell
docker compose ps
docker compose logs -f family-planner
```

Stoppen:

```powershell
docker compose down
```

Die aktiven Daten liegen in `data/`, Sicherungen in `backups/`. Beide Ordner
werden absichtlich nicht in Git aufgenommen.

## Bequem und sicher aktualisieren

### Docker unter Windows

Ein Doppelklick genügt:

```text
Update-Familienplaner.cmd
```

Das Update läuft bewusst in dieser Reihenfolge:

1. Nur bei einem sauberen Programmordner wird die neue Git-Version geladen.
2. Das bisherige Docker-Abbild wird als Rückfallversion vorgemerkt.
3. Die neue Version wird gebaut, während der Planer noch erreichbar bleibt.
4. Danach wird die App kurz angehalten und eine konsistente SQLite-Sicherung
   samt Prüfmanifest erstellt.
5. Alle Datenbankmigrationen laufen zuerst auf einer temporären Kopie dieser
   Sicherung.
6. Erst nach erfolgreicher Simulation startet die neue Version.
7. Abschließend werden alle bereits vorhandenen Datensätze und gespeicherten
   Einstellungen mit dem Stand vor dem Update verglichen.

Schlägt Start, Migration, Gesundheitscheck oder Datenvergleich fehl, stellt das
Skript automatisch die vorherige Docker-Version und die Sicherung wieder her.

Lokale Änderungen an Programmdateien werden nicht überschrieben. In diesem Fall
bricht das Update mit einer Erklärung ab. Absichtlich lokal bereitgestellter
Quellcode kann ohne Git-Abruf aktualisiert werden:

```powershell
powershell -File scripts/docker-update.ps1 -SkipPull
```

### Docker unter Linux

Im Projektordner:

```bash
bash scripts/docker-update.sh
```

Ohne Git-Abruf:

```bash
bash scripts/docker-update.sh --skip-pull
```

### Ohne Docker

Vor dem Austausch des Programmcodes:

```powershell
npm run backup
git pull --ff-only
npm ci
npm run check
```

Danach den laufenden Node-Prozess beziehungsweise den verwendeten Systemdienst
neu starten und prüfen:

```powershell
npm run audit
```

Die `.env` darf bei einem Update nicht ersetzt werden. Insbesondere
`APP_SECRET` muss gleich bleiben, weil damit Bring!, Gotify, private
Kalenderlinks und Push-Schlüssel verschlüsselt werden.

### Was erhalten bleibt

Der Docker-Updater behält den Ordner `data/` als unabhängiges Volume. Das
Prüfmanifest kontrolliert unter anderem:

- Familienkonten, Profile, Rollen, PINs, Sterne und Profil-Themes
- Kalendertermine, Aufgaben, Einkauf, Speisepläne und Mülltermine
- importierte Rezepte einschließlich Zutaten, Zubereitung und Bildern
- Pinnwandnotizen und Pinnwandbilder
- Chat, Familiennetz, Medienlinks und Dashboard-Inhalte
- Kalender-Abos, Bring!, Gotify und deren verschlüsselte Konfiguration
- Push-Geräte, Benachrichtigungseinstellungen und Familien-Posteingang

Gerätespezifische Komfortwerte wie das zuletzt aktive Profil, der ausgewählte
Haushalt, die Reihenfolge der Dashboard-Kacheln und ein zurückgestellter
Benachrichtigungshinweis liegen im Browser. Ein Update löscht diesen Speicher
nicht. Dafür müssen Adresse und Port der App gleich bleiben.

## Weg 2: Ohne Docker starten

Voraussetzungen:

- Node.js 22.13 oder neuer
- npm

Einmalig vorbereiten:

```powershell
Copy-Item .env.example .env
npm ci
npm run build
```

`APP_SECRET` in `.env` vor dem ersten produktiven Start durch einen langen,
zufälligen Wert ersetzen. Danach:

```powershell
npm start
```

Die App läuft unter `http://localhost:3001`.

Für die Entwicklung werden zwei Terminals verwendet:

```powershell
npm run server
```

```powershell
npm run dev
```

Vite läuft dann unter `http://localhost:3000` und leitet API-Anfragen an den
Server auf Port `3001` weiter.

## Externe Kalender verbinden

Eltern und Großeltern können im Familienkalender unter **Kalenderquellen**
veröffentlichte ICS-Links aus Google Kalender, Outlook, Nextcloud und anderen
Kalenderdiensten hinterlegen. Die Verbindung ist bewusst nur lesend:

- der geheime Kalenderlink wird verschlüsselt in SQLite gespeichert,
- Termine werden standardmäßig einmal pro Stunde aktualisiert,
- wiederkehrende Termine, Ausnahmen, Ganztagstermine und Zeitzonen werden
  berücksichtigt,
- abonnierte Termine sind im Familienplaner als schreibgeschützt markiert,
- bei einem Verbindungsfehler bleiben die zuletzt erfolgreich gelesenen
  Termine erhalten.

Kalender auf privaten Heimnetz-Adressen sind aus Sicherheitsgründen zunächst
gesperrt. Für einen lokalen Nextcloud- oder CalDAV-Server kann in `.env`
bewusst freigeschaltet werden:

```text
CALENDAR_ALLOW_PRIVATE_HOSTS=true
```

Link-Local- und Loopback-Adressen bleiben trotzdem gesperrt. Das
Aktualisierungsintervall lässt sich mit
`CALENDAR_SYNC_INTERVAL_MINUTES=60` anpassen.

## Benachrichtigungen

### Browser-Push

Browser-Benachrichtigungen werden pro Familienprofil und Gerät gespeichert. Ein
Gerät kann mehreren Profilen zugeordnet sein; in den Profileinstellungen lassen
sich einzelne Meldungsarten an- und ausschalten.

Unabhängig davon landen wichtige Ereignisse zusätzlich im profilgetrennten
Familien-Posteingang der App. Der Reiter **Heute** bündelt Termine, fällige
Aufgaben, Elternfreigaben, Speiseplan und Einkauf passend zum aktiven Profil.
Im Reiter **Meldungen** bleiben Aufgabenfreigaben, Termine und Chatnachrichten
nachvollziehbar, auch wenn ein Browser-Push nicht zugestellt wurde.
Gelesen/ungelesen wird zwischen den Geräten synchronisiert; alte Meldungen
werden nach 90 Tagen automatisch entfernt.

Echte Benachrichtigungen im Hintergrund benötigen eine vertrauenswürdige
HTTPS-Adresse. Eine reine Heimnetz-Adresse wie `http://192.168.x.x:3001` genügt
den Browsern dafür nicht. Empfohlen ist ein Reverse Proxy wie Caddy, Traefik
oder nginx vor Port `3001`. Die Adresse kann über internes DNS trotzdem auf das
Heimnetz beschränkt bleiben.

Auf iPhone und iPad muss die App zuerst zum Home-Bildschirm hinzugefügt und von
dort geöffnet werden.

### Gotify, Telegram und WhatsApp

- **Gotify:** bereits als unabhängiger Elternkanal integriert.
- **Telegram:** sinnvollster nächster Kanal. Geplant ist eine einmalige
  Profilkopplung über QR-/Start-Link zu einem Familien-Bot, ohne dass Kinder
  Tokens eingeben müssen.
- **WhatsApp:** technisch nur über die offizielle WhatsApp Business Platform
  vorgesehen. Eine Kopplung eines privaten WhatsApp-Kontos über inoffizielle
  Web-Sitzungen gehört bewusst nicht zum Produktionskonzept.

## Sicherheit und Daten

- Passwörter und Profil-PINs werden nicht im Klartext gespeichert.
- Sitzungen verwenden ein `HttpOnly`-Cookie.
- Familien und Direktnachrichten werden serverseitig voneinander isoliert.
- Bring!-Zugangsdaten, private Kalenderlinks und Push-Schlüssel werden mit
  `APP_SECRET` verschlüsselt.
- Der Docker-Container läuft ohne Root-Rechte, mit schreibgeschütztem
  Dateisystem, ohne Linux-Capabilities und mit `no-new-privileges`.
- Ohne `AGENT_API_KEY` bleibt die optionale Agent-Schnittstelle deaktiviert.
- SQLite läuft im WAL-Modus und kritische Punktebuchungen sind transaktional.

Wichtig: Wer `APP_SECRET` später ändert, muss verschlüsselte Integrationen wie
Bring! erneut verbinden.

## Backups

Mit Docker:

```text
Backup-Familienplaner.cmd
```

Ohne Docker:

```powershell
npm run backup
```

Zu jeder neuen `.sqlite`-Sicherung wird eine Datei
`.sqlite.manifest.json` angelegt. Sie enthält keine Passwörter oder
Integrationstokens, sondern Prüfsummen, Datensatzkennungen und
Integritätsergebnisse. Damit kann nach einem Update erkannt werden, ob ein
bestehender Eintrag oder ein gespeichertes Einstellungsfeld fehlt oder verändert
wurde.

Sicherungen sollten regelmäßig zusätzlich auf ein anderes Gerät oder Medium
kopiert werden. Ein Backup ist erst dann ein gutes Backup, wenn die
Wiederherstellung einmal getestet wurde.

## Konfiguration

Die Vorlage liegt in `.env.example`.

| Variable | Bedeutung |
| --- | --- |
| `APP_SECRET` | Pflicht in Produktion; verschlüsselt sensible lokale Daten |
| `PORT` | interner Server-Port, Standard `3001` |
| `HOST_PORT` | Port des Docker-Hosts, Standard `3001` |
| `DATABASE_FILE` | abweichender Pfad zur SQLite-Datenbank |
| `LEGACY_DATABASE_FILE` | optionaler JSON-Altbestand für die erste Migration |
| `AGENT_API_KEY` | aktiviert optional die geschützte Agent-API |
| `RECIPE_HOSTS` | zusätzliche erlaubte Hosts für den Rezeptimport |
| `VAPID_*` | optionale feste Web-Push-Schlüssel |

## Qualität prüfen

```powershell
npm run check
```

Der Befehl prüft die Serverdateien, führt den isolierten API-Smoke-Test aus und
erstellt einen vollständigen Produktions-Build.

Nur die aktive Datenbank kontrollieren:

```powershell
npm run audit
```

## Architektur

```text
Browser / PWA
    │
    ├── React-Oberfläche und rollenabhängige Themes
    ├── Service Worker für Web Push
    │
    ▼
Express API
    ├── Sitzungen und Berechtigungen
    ├── Familien-, Profil- und Integrationslogik
    ├── geschützter Echtzeit-Ereigniskanal
    │
    ▼
SQLite
    ├── Familienisolierte Daten
    ├── verschlüsselte Integrationswerte
    └── transaktionale Aufgaben- und Punktebuchungen
```

Wichtige Bereiche:

- `server/app.js` – HTTP-API, Sitzungen, Berechtigungen und Integrationen
- `server/database.js` – Schema, Migrationen und Transaktionen
- `src/context/FamilyContext.jsx` – zentraler Client-Datenzugriff
- `src/components/Auth` – Anmeldung und Familienkonto
- `src/components/Dashboard` – Erwachsenen-, Kinder- und Tablet-Dashboard
- `src/index.css` – Theme-System und responsive Produktoberfläche

## Projektstatus

Der Planer ist für den privaten, selbst gehosteten Familienbetrieb ausgelegt.
Vor Aktualisierungen sollte immer ein Backup erstellt werden. Zugang aus dem
öffentlichen Internet sollte nur über HTTPS, einen Reverse Proxy und eine
bewusst konfigurierte Zugriffsschicht erfolgen.
