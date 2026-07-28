# Changelog

Alle wichtigen Änderungen am LX Family Planner werden hier festgehalten.

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
