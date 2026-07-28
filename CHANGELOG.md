# Changelog

Alle wichtigen Änderungen am LX Family Planner werden hier festgehalten.

## [1.7.0] – 2026-07-28

### Native Android-Benachrichtigungen

- Firebase Cloud Messaging als echter nativer Push-Kanal für die Android-App
- Benachrichtigungen erreichen das Gerät auch bei geschlossener App
- profil- und gerätegebundene Registrierung ohne manuelle Token-Eingabe
- gemeinsame Ereignis-Pipeline für Chat, Kalender, Erinnerungen, Aufgaben,
  Problemmeldungen, Kinderbefinden und weitere wichtige Familienereignisse
- getrennte Android-Kanäle und Prioritäten für allgemeine, dringende, Chat-,
  Kalender- und Aufgabenmeldungen
- Antippen einer Meldung öffnet möglichst direkt den passenden Bereich
- Einstellungen für native App-Benachrichtigungen in Profil und Elternzentrale

### Sicherheit und Betrieb

- Serverauthentifizierung über einen privaten, von Git ausgeschlossenen
  Firebase-Dienstschlüssel
- Android-Build bricht verständlich ab, wenn die passende
  `google-services.json` fehlt
- automatische Datenbankmigration für dauerhaft gespeicherte native Geräte
- Browser-Push und Gotify bleiben als unabhängige, optionale Kanäle erhalten

## [1.6.0] – 2026-07-28

### Family Cloud

- optionale Nextcloud-Anbindung in der Elternzentrale
- konfliktbewusste Zwei-Wege-Synchronisation für den Familienkalender
- stabile Zuordnung von lokalen und entfernten Terminen einschließlich
  Änderungen und Löschungen
- frei wählbarer Nextcloud-Kalender und Standardprofil für externe Termine
- getrennte Option für Termine aus „Zuhause Oma & Opa“
- eigener Familienordner über WebDAV
- manuelle und tägliche, familiengetrennte AES-256-GCM-Backups in Nextcloud
- Zugang ausschließlich über ein widerrufbares App-Passwort; der Schlüssel
  bleibt verschlüsselt im Backend

### Docker und Proxmox

- optionales Nextcloud-34-Profil mit MariaDB, Redis und Cron
- sichere Aktivierung über `Nextcloud-Aktivieren.cmd`,
  `scripts/nextcloud-enable.sh` oder `lx-family nextcloud`
- zufällige Kennwörter und automatisch ergänzte vertrauenswürdige Heimnetz-
  Adressen
- Nextcloud-Daten liegen in unabhängigen Docker-Volumes und bleiben bei
  normalen LX-Updates erhalten

### Zuverlässigkeit

- neue Datenbankmigration für dauerhafte Cloud-Synchronisationszuordnungen
- Konflikttest, DAV-Dateitest und Löschabgleich in der automatischen Testsuite
- Update-Integritätsprüfung umfasst jetzt auch Cloud-Zuordnungen

## [1.5.0] – 2026-07-28

### Proxmox VE

- neuer One-Liner für einen unprivilegierten Debian-12/13-LXC
- Standard- und erweiterter Modus für Ressourcen, Speicher und Netzwerk
- automatische Installation von Docker Engine und LX Family Planner
- sichere Bestätigung vor der Container-Erstellung und kein automatisches
  Löschen bei Fehlern
- Container-Verwaltung über `lx-family` mit Update, Backup, Logs, Domain,
  Neustart und Diagnose

### Docker

- die signierte Android-APK bleibt jetzt ausdrücklich im Docker-Build-Kontext
- neue Docker- und PVE-Installationen liefern App-Download und QR-Code
  vollständig aus

## [1.4.1] – 2026-07-28

### Behoben

- QR-Codes werden nicht mehr mit einer für Handys unbrauchbaren
  `localhost`-Adresse erzeugt
- die API liefert zusätzlich eine vollständige öffentliche APK-Adresse
- lokale Vorschauen erklären stattdessen, wie LX über Heimnetz oder öffentliche
  Domain geöffnet werden kann

### Konfiguration

- neue optionale Variable `PUBLIC_APP_URL` für die feste öffentliche
  Planer-Adresse

## [1.4.0] – 2026-07-28

### Neu

- öffentlicher Android-App-Download direkt auf der Anmeldeseite
- dynamischer QR-Code zum APK-Download über die eigene LX-Adresse
- Anzeige von App-Version, Dateigröße und Android-Mindestversion
- automatisch wiederverwendete Release-Signatur für installierbare Updates
- signierte APK wird als Bestandteil des Docker- und Server-Releases
  ausgeliefert

### Sicherheit und Betrieb

- der private Signierschlüssel bleibt ausschließlich im ignorierten
  `data/android-signing`-Ordner
- Produktionsserver bieten weiterhin nur signierte Release-APKs an
- vorhandene Familien- und App-Daten werden durch das Update nicht verändert

## [1.3.1] – 2026-07-28

### Neu

- ein gemeinsamer Benachrichtigungskatalog für Browser-Push, Posteingang und
  Gotify
- Meldungen für normale und dringende Kinder-Gefühlslagen
- Meldungen für neue und bearbeitete Problemmeldungen
- Benachrichtigungen bei neuen, geänderten und abgesagten Terminen
- Hinweise zu Familienverbindungen, Freigaben und gemeinsamen Terminen
- Meldungen für Belohnungen, Taschengeld, Schule, Routinen und
  Familienmissionen

### Verbessert

- Empfänger werden passend zum Profil bestimmt; verwaltete Profile und
  Haustiere informieren die zuständigen Erwachsenen
- Ruhezeiten werden nur noch von ausdrücklich dringenden Ereignissen
  übergangen
- sämtliche Meldungsarten sind pro Browsergerät sowie für Gotify einzeln
  einstellbar
- der Familien-Posteingang zeigt alle neuen Meldungsarten mit passenden
  Symbolen und direkten Zielen

### Update und Daten

- keine neue Datenmigration erforderlich
- bestehende Push-Geräte und ihre Einstellungen werden um neue Standardregeln
  ergänzt, ohne gespeicherte Auswahl zu verlieren
- alle Familieninhalte und Integrationen bleiben unverändert erhalten

## [1.3.0] – 2026-07-28

### Neu

- mehrere frei kombinierbare Erinnerungszeitpunkte pro Kalendertermin
- serverseitige Zustellung über Familien-Posteingang, Web-Push und Gotify
- Android-App und installierte PWA als Teilen-Ziel für Chefkoch, Pinterest und
  andere Rezept-Apps
- automatischer Rezeptimport aus einem geteilten Link
- auswählbare Server-Adresse in der Android-App für Heimnetz und eigene Domain

### Zuverlässigkeit

- dauerhafte Duplikatkontrolle für Terminerinnerungen
- nach Serverpausen wird nur die sinnvollste fällige Erinnerung nachgeholt
- verwaltete Personen- und Haustiertermine erinnern die zuständigen Erwachsenen
- feste Zeitzone `Europe/Berlin` als Docker-Standard
- automatische Datenbankmigration auf Schema 6
- native Server-Anmeldungen über zugelassene Ursprünge abgesichert

## [1.2.0] – 2026-07-28

### Neu

- Familienreise mit Routinen, Wochenrückblick, Sparzielen, Taschengeld,
  Schulorganisation, Abstimmungen, Mutmachern und Familienmissionen
- verwaltete Profile ohne eigene Anmeldung für Großeltern und betreute Personen
- sichere Verbindungen zwischen Familien für gemeinsame Termine, Aufgaben,
  Belohnungen und Taschengeld
- Home-Assistant-Kacheln mit Profilfreigaben und geschützten Aktionen
- eigene Bilder und eine größere Symbolauswahl für Belohnungen
- „Problem melden“ mit Verwaltung in der Elternzentrale
- einmalige, profilgebundene Patchnotes für Erwachsene und Großeltern

### Verbessert

- dunkle Designs für Einkaufskatalog, Produktkacheln und Aktionszustände
- Kinderprofile, Tablet- und Mobilansichten
- Aufgabenbestätigung durch Erwachsene vor der Punktevergabe
- Rezeptimport aus Schema.org-, h-recipe- und unterstützten Pinterest-Seiten
- Rezeptbilder und verständlichere Reihenfolge der Zubereitungsschritte
- Pinnwandbilder, Familiennetz und Stammbaum
- profilgebundene Web-Push-Einstellungen und mobiler Chat

### Update und Daten

- automatische Datenbankmigration auf Schema 5
- bestehende Profile, Termine, Aufgaben, Rezepte, Listen, Bilder,
  Integrationen und Einstellungen bleiben erhalten
- Docker-Updater mit Sicherung, Migrationssimulation, Versionsprüfung,
  Datenvergleich und automatischem Rollback

### Aktualisieren

- Windows/Docker: `Update-Familienplaner.cmd`
- Linux/Docker: `bash scripts/docker-update.sh`
