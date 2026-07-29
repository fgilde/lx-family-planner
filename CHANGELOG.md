# Changelog

Alle wichtigen Änderungen am LX Family Planner werden hier festgehalten.

## [1.13.0] – 2026-07-29

### Echte Cover in der Kinder-Medienlounge

- YouTube- und Spotify-Kacheln zeigen jetzt das echte Kanal-, Video-,
  Playlist- oder Album-Cover statt eines großen Plattform-Symbols
- Spotify-Metadaten kommen ohne eigenen API-Schlüssel aus der offiziellen
  oEmbed-Schnittstelle
- YouTube-Videos verwenden ihr offizielles Thumbnail; bei Kanal-Links liest
  LX kontrolliert das offizielle Vorschaubild der YouTube-Seite
- nur HTTPS-Bilder von freigegebenen YouTube- und Spotify-Bildservern werden
  gespeichert; beliebige externe Cover-Adressen werden verworfen
- bestehende Medien-Widgets werden nach dem Update automatisch ergänzt und
  ihre Cover regelmäßig vorsichtig aktualisiert
- neues bildzentriertes Kartendesign mit lesbarem Verlauf, kompakter
  Abspielschaltfläche und sauberem Fallback in allen Themes
- Eltern sehen die Cover bereits in der Medienverwaltung
- Regressionstests prüfen YouTube-Video-/Kanalbilder, Spotify-oEmbed und die
  Blockierung fremder Bildserver

## [1.12.1] – 2026-07-29

### Chatfotos vollständig im Familienarchiv

- eingebettete Fotos aus älteren App- und Browserständen werden beim Senden
  automatisch als echte Cloud-Anhänge gespeichert
- vorhandene eingebettete Chatfotos werden nach einem Update automatisch in
  `Familie/Chat/Jahr-Monat` verschoben
- die Nachricht bleibt während der Umstellung vollständig erhalten und
  verweist danach auf die geschützte Cloud-Datei
- Chatbilder lassen sich per Tipp in einer großen Vollbildansicht öffnen
- die Bildansicht funktioniert auf Handy, Tablet und Desktop, liegt sicher
  über allen Menüs und bietet einen direkten Download
- Regressionstest deckt ausdrücklich den alten `photo`-Sendeweg und den
  anschließenden geschützten Dateiabruf ab

## [1.12.0] – 2026-07-29

### Native App-Updates und Chat-Anhänge in der Family Cloud

- Versionsprüfung läuft beim Android-App-Start, beim Zurückkehren in die App
  und zusätzlich regelmäßig im Hintergrund der geöffneten App
- neuer nativer Update-Ablauf lädt die APK innerhalb von LX, prüft die
  veröffentlichte SHA-256-Summe und öffnet danach den Android-Installer
- Update-Hinweis ist auch vor der Familienanmeldung sichtbar und kann für den
  aktuellen App-Start auf später verschoben werden
- Chat-Anhänge werden nicht mehr als große Base64-Daten in den
  Chat-Datensätzen gespeichert, sondern als echte Dateien in der Family Cloud
- Bilder, Videos, Audio, PDF-/Office-Dokumente, ZIP/Archive und APKs bis
  100 MB sowie bis zu acht Anhänge pro Nachricht
- geschützte Vorschau und Download im Chat; aktive Dateitypen werden niemals
  ungeprüft im Browser ausgeführt
- signierte Anhangsmetadaten verhindern, dass Clients beliebige Cloud-Pfade
  als Chat-Datei ausgeben; Direkt- und Gastchat-Berechtigungen gelten auch für
  den Dateiabruf
- Anhänge aus Direktnachrichten werden vor dem Cloud-Upload mit AES-256-GCM
  verschlüsselt und bleiben selbst im gemeinsamen Nextcloud-Konto privat
- vorhandene eingebettete Chatfotos bleiben vollständig kompatibel
- gemeinsame Chat-Ablage unter `Familie/Chat/Jahr-Monat`
- automatische Cloud-Grundstruktur mit `Familie`, `Familie/Uploads` und einem
  Ordner unter `Profile` für jedes echte Nutzerprofil
- Dashboard-Uploads öffnen eine Zielordnerauswahl mit direkter
  Ordnererstellung; Dateien im Cloud-Stammverzeichnis werden verhindert
- allgemeines Datei- und Chat-Uploadlimit auf 100 MB je Datei erweitert
- Regressionstests prüfen Cloud-Ordner, ZIP-Upload, sicheren Abruf und
  manipulierte Anhangsmetadaten

## [1.11.0] – 2026-07-29

### Das Familienarchiv wird zum eigenen Arbeitsbereich

- die Seite **Family Cloud** zeigt nur noch Dateien, Ordner, Speicher und
  Upload-Aktionen; technische Einstellungen wurden vollständig entfernt
- Cloud-Verbindung, Kalendersynchronisation, Sicherungen und Zugangsdaten
  befinden sich jetzt gesammelt in der Elternzentrale
- der bisherige externe Link zum Nextcloud-Familienordner wurde entfernt,
  damit niemand vor einem unerwarteten Nextcloud-Login landet
- neues Dashboard-Widget **Familienarchiv** mit Speicherstand, letzten
  Inhalten und direktem Upload
- Galerie- und Listenansicht, Suche im aktuellen Ordner und freundliche
  Pfadnavigation ergänzen die integrierte Dateiverwaltung
- Bilder erhalten echte Vorschaubilder; Ordner werden als visuelle
  Sammlungen dargestellt
- Mobil- und Tabletansicht sowie dunkle Themes wurden visuell geprüft

## [1.10.2] – 2026-07-29

### Selbstheilende Family-Cloud-Konten

- verwaltete Nextcloud-Verknüpfungen werden beim automatischen Cloud-Lauf
  nicht mehr ungeprüft übersprungen
- wurde das zugehörige Nextcloud-Konto gelöscht oder ist sein App-Zugang
  ungültig, richtet LX dasselbe isolierte Familienkonto automatisch neu ein
- Familienordner, Kalender, App-Passwort und das Speicherlimit werden dabei
  wiederhergestellt
- fremde oder manuell verbundene Nextcloud-Instanzen werden von der Reparatur
  nicht verändert
- ein Regressionstest bildet das gelöschte Testkonto und die anschließende
  automatische Wiederherstellung vollständig ab

## [1.10.1] – 2026-07-29

### Automatische Nextcloud-Konten und sichtbarer Speicher

- vorhandene Familien ohne Cloud-Verbindung werden nach dem Serverstart
  automatisch in der mitgelieferten Nextcloud eingerichtet
- neue Familien erhalten kurz nach der Registrierung automatisch ein
  getrenntes Nextcloud-Familienkonto
- Konto, App-Passwort, Familienkalender und Ordner `LX Family` werden ohne
  zusätzlichen Klick erzeugt
- standardmäßig erhält jede Familie 10 GB Speicher; über
  `NEXTCLOUD_FAMILY_QUOTA` frei konfigurierbar
- Speichernutzung wird live aus Nextcloud gelesen und als Fortschrittsanzeige
  im integrierten Familienarchiv dargestellt
- ausdrücklich getrennte Cloud-Verbindungen werden über eine
  Opt-out-Markierung nicht automatisch wiederhergestellt
- `NEXTCLOUD_AUTO_PROVISION=false` schaltet die automatische Einrichtung bei
  Bedarf serverweit ab
- interne Nextcloud-Adresse kann für besondere Docker-Netze über
  `NEXTCLOUD_INTERNAL_URL` vorgegeben werden
- automatischer Test prüft Konto, Kontingent, Ordner, Kalender und
  idempotente Wiederholung

## [1.10.0] – 2026-07-29

### Integrierte Family Cloud, Familienpost und Chatgäste

- Nextcloud-Dateiansicht direkt in LX Family mit Ordnernavigation,
  Bild-/PDF-/Textvorschau, Download und geschütztem Löschen
- Mehrfach-Upload per Dateiauswahl und Drag-and-drop bis 25 MB pro Datei
- Cloud-Dateien werden ausschließlich über die angemeldete LX-Sitzung und den
  serverseitig verschlüsselten Nextcloud-Zugang übertragen
- neuer Erwachsenenbereich **Familienpost** für private Briefe zwischen
  bestätigten Familienverbindungen
- Briefe unterstützen Antworten, Eingang/Gesendet, gelesen und persönliches
  Archivieren
- gezielte Einladung einzelner Erwachsenenprofile wie Oma oder Opa in den
  Gruppenchat einer verbundenen Familie
- Chatgast muss selbst zustimmen und sieht ausschließlich Gruppennachrichten
  ab dem Zeitpunkt der Zustimmung; Direktnachrichten und ältere Verläufe
  bleiben verborgen
- Familienpost und Chat-Einladungen an Browser-, Android- und Gotify-
  Benachrichtigungen angebunden
- Kalenderänderungen per `PATCH` in Browser und Android wieder freigegeben;
  dadurch lassen sich Erinnerungszeitpunkte wieder speichern
- mobiler **Problem melden**-Knopf aus der schwebenden Bedienebene entfernt
  und als normaler Seitenabschluss dargestellt
- neues, wiederholbar ausführbares Cloud-Domain-Skript setzt
  `trusted_domains`, `overwrite.cli.url` und HTTPS korrekt
- Nextcloud-Aktivierung bewahrt vorhandene vertrauenswürdige Domains statt
  sie beim erneuten Start zu überschreiben
- additive Datenbankmigration für Briefe, Lesestatus und Chat-Einladungen;
  bestehende Familieninhalte bleiben unangetastet

## [1.9.3] – 2026-07-29

### Erreichbare Nextcloud-Adresse statt Domain-Port-Mischung

- öffentliche Planer-Domains erhalten nicht länger automatisch Port `8080`
- neue Servervorgabe `NEXTCLOUD_PUBLIC_URL` für die tatsächlich erreichbare
  Browser-Adresse
- Docker-Aktivierung setzt ohne öffentliche Vorgabe automatisch die
  funktionierende Heimnetz-Adresse
- bestehende gebündelte Verbindungen verwenden die Servervorgabe sofort, ohne
  Trennen oder erneutes Anlegen des Cloud-Kontos
- Zugangsanzeige, Familienordner-Link und Einstellungsformular verwenden
  dieselbe zentrale Adresse
- Hinweise für separate HTTPS-Subdomain und Reverse-Proxy ergänzt

## [1.9.2] – 2026-07-29

### Family Cloud als eigener Hauptbereich

- neuer, nur für Erwachsene sichtbarer Menüpunkt **Family Cloud**
- Nextcloud-Einrichtung aus der langen Elternzentrale herausgelöst
- direkte Ansicht für Kalenderabgleich, Cloud-Sicherungen und Familienordner
- `?view=cloud` und Benachrichtigungsnavigation als gültiges Ziel ergänzt
- eingeschränkte Erwachsenenprofile behalten Zugriff auf Cloud und
  Elternzentrale
- responsive Seitenfläche mit allen vorhandenen Theme-Variablen

## [1.9.1] – 2026-07-29

### Direkter Zugriff auf den automatisch angelegten Familienordner

- automatisch erzeugtes Web-Kennwort wird zusammen mit dem App-Passwort
  verschlüsselt im jeweiligen Familienbereich gespeichert
- Erwachsene können Nextcloud-Adresse, Benutzername und Kennwort gezielt unter
  **Verbindung verwalten → Cloud-Zugang anzeigen** öffnen
- einzelne Kopierknöpfe mit Fallback für lokale HTTP-Heimnetze
- Antwort mit Zugangsdaten wird ausdrücklich nicht zwischengespeichert
- Zugang wird im Browser erst auf Klick geladen und beim Trennen verworfen

## [1.9.0] – 2026-07-29

### Vollautomatische Family Cloud

- mitgelieferte Nextcloud auf dem Produktionsserver aktiviert
- automatische Einrichtung direkt aus der Elternzentrale
- getrenntes Nextcloud-Konto pro Familie statt gemeinsamem Administratorkonto
- zufälliges Startkennwort und widerrufbares App-Passwort werden serverseitig
  erzeugt; nur das App-Passwort wird verschlüsselt in LX gespeichert
- eigener Familienkalender wird angelegt, wenn noch keiner vorhanden ist
- Familienordner und erster Zwei-Wege-Kalenderabgleich werden sofort vorbereitet
- Trennen der Verbindung widerruft das verwendete App-Passwort in Nextcloud
- manuelle Verbindung zu einer vorhandenen Nextcloud bleibt erhalten
- Docker-Helfer wartet auf den vollständigen Nextcloud-Start und versucht,
  die offizielle Kalenderoberfläche zu ergänzen
- automatische Tests für Kontotrennung und erneuerbare Cloud-Zugänge ergänzt

## [1.8.1] – 2026-07-29

### App-Icon mit sicherem Abstand

- Kalender- und Familienmotiv auf 82 Prozent verkleinert
- rundherum eine farblich passende Sicherheitszone ergänzt
- Übergang zwischen Motivfläche und Icon-Hintergrund weich ausgeblendet
- normale, runde und adaptive Android-Icons neu erzeugt
- Android-Version auf Code 18 erhöht, damit Geräte das Icon-Update erkennen

## [1.8.0] – 2026-07-29

### Flexible Erinnerungen und neuer App-Auftritt

- Kalendertermine unterstützen mehrere auswählbare Erinnerungszeitpunkte
- zusätzliche Presets für 15 Minuten und 12 Stunden
- Mülltermine erinnern standardmäßig einen Tag vorher um 09:00 Uhr
- importierte und bereits vorhandene Abholtermine erhalten den sicheren
  Vortags-Standard automatisch
- Müll-Erinnerungen lassen sich pro Abholung ändern oder ganz ausschalten
- Android-, Browser- und Gotify-Auslieferung verwenden dieselbe Kalenderregel
- neuer App-Icon-Entwurf für Android, Web-App, Manifest und README
- automatische Tests sichern Standard, Abschalten und doppelte Zustellung ab

## [1.7.7] – 2026-07-29

### Offenen Capacitor-Thenable-Fehler umgangen

- Ursache des Hängers bei „Android wird vorbereitet“ anhand des offenen
  Capacitor-Issues #8472 verifiziert
- Capacitor-Plugin-Proxys überschreiten keine Promise-/Async-Grenze mehr
- Listener-Einrichtung verwendet einen sicheren einfachen Objekt-Container
- Regressionstest simuliert exakt die fehlerhafte Thenable-Erkennung
- direkte native Firebase-Diagnose und Token-Rückgabe aus Version 1.7.6 bleiben
  erhalten

## [1.7.6] – 2026-07-29

### Direkte native Firebase-Token-Brücke

- eigener nativer Android-Weg liefert den Firebase-Geräteschlüssel direkt
- Firebase-Konfiguration und Google Play-Dienste werden vorab geprüft
- der unzuverlässige ereignisbasierte Rückweg des Standard-Plugins entfällt
- Netzwerk-, Firebase- und Play-Services-Probleme werden konkret angezeigt
- der allgemeine 45-Sekunden-Abbruch verdeckt keine eigentliche Ursache mehr

## [1.7.5] – 2026-07-28

### Android-Push-Modul fest in die App integriert

- das Push-Modul wird nicht mehr als separate Laufzeitdatei nachgeladen
- der auf dem betroffenen Android-Gerät erkannte Modul-Ladehänger entfällt
- alle nachfolgenden Diagnose- und Zeitgrenzen aus Version 1.7.4 bleiben aktiv
- vorhandene Profile, Anmeldung und Familiendaten bleiben erhalten

## [1.7.4] – 2026-07-28

### Gesamte Android-Push-Anmeldung gegen Hänger abgesichert

- jeder native Einzelschritt besitzt jetzt eine feste Zeitgrenze
- der Knopf zeigt während der Anmeldung den aktuellen Arbeitsschritt
- auch Serverprüfung und Speichern des Geräteschlüssels können die Oberfläche
  nicht mehr unbegrenzt blockieren
- eine konkrete Fehlermeldung bleibt direkt in der Elternzentrale sichtbar
- die vorhandenen Familien- und App-Daten bleiben unverändert

## [1.7.3] – 2026-07-28

### Kein endloses „Wird verbunden …“ mehr

- die Android-Firebase-Registrierung blockiert den eigenen Zeitwächter nicht
  mehr
- spätestens nach 20 Sekunden erscheint entweder die erfolgreiche Anmeldung
  oder die konkrete Android-/Firebase-Ursache
- automatischer Test simuliert einen vollständig festhängenden nativen
  Registrierungsaufruf

## [1.7.2] – 2026-07-28

### Android-Push-Status eindeutig und robust

- der bestätigte Firebase-Serverstatus wird bereits mit dem normalen
  Familien-Startabruf geliefert
- ein Fehler bei Gerätekennung oder Android-Berechtigung kann nicht mehr
  fälschlich als fehlender Firebase-Dienstschlüssel erscheinen
- ein gemeinsamer API-Weg verhindert unterschiedliche Cache- und
  Sitzungsbehandlung
- ältere Android-WebViews erhalten eine kompatible lokale Gerätekennung
- die Elternzentrale zeigt echte Abruffehler und bietet „Erneut prüfen“ an

## [1.7.1] – 2026-07-28

### Android-Push zuverlässig aktivieren

- Firebase-Serverstatus und Android-Berechtigung werden unabhängig geprüft
- die Elternzentrale zeigt keinen falschen Hinweis auf eine fehlende
  Firebase-Verbindung mehr, wenn nur die Android-Abfrage stockt
- beide von Android unterstützten Berechtigungsdialoge werden korrekt geöffnet
- Push-Status wird beim Öffnen der Elternzentrale frisch vom Server geladen
- Statusantworten und API-Abfragen werden nicht mehr aus einem alten Cache
  übernommen

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
