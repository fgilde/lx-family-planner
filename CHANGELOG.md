# Changelog

Alle wichtigen Änderungen am LX Family Planner werden hier festgehalten.

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
