# Produkt-Roadmap

## Bereits umgesetzt

- rollenabhängige Erwachsenen-, Kinder- und Tablet-Oberflächen
- frei wählbare Familienpositionen wie Mama, Papa, Kind, Oma und Opa
- getrennte Themenwelten für Kinder und Erwachsene
- Missionen, Sterne, Belohnungen und Stimmungs-Check-in
- Vier-Augen-Freigabe für erledigte Kinderaufgaben
- Kalender, Mülltermine, Einkauf, Rezepte, Essensplan, Pinnwand und Chat
- mobile Chat-Oberfläche und responsive Bubble-Profilauswahl
- Elternzentrale und kindgerechte Medienlinks
- Familiennetz und Beziehungen zwischen Familienkonten
- Bring!-, ICS-, Gotify- und profilgebundene Web-Push-Anbindung
- sichere, familiengetrennte Datenhaltung und transaktionale Punktebuchung

## Nächste sinnvolle Produktstufe

### Priorität 1 – Betrieb und Verlässlichkeit

1. **Einladungslinks statt öffentlicher Familienauswahl**  
   Neue Geräte treten über einen zeitlich begrenzten Familiencode bei. Ein
   öffentlich erreichbarer Server muss dann keine Familiennamen anzeigen.

2. **Telegram-Bot mit Profilkopplung per QR-Code**  
   Die Eltern tragen genau einmal den Bot-Token in der Elternzentrale ein.
   Jedes Profil erhält einen kurzlebigen QR-/Start-Link. Nach einem Klick auf
   „Start“ ordnet der Server den Telegram-Chat dem Profil zu. Benachrichtigungen,
   Ruhezeiten und Inhalte bleiben pro Profil steuerbar.

3. **Automatisierte Sicherung samt Wiederherstellungsprobe**  
   Backups regelmäßig erstellen, auf ein zweites Ziel kopieren und in einer
   isolierten Testdatenbank automatisch wiederherstellen.

4. **Wiederkehrende Aufgaben und Termine**  
   Regeln wie „jeden Dienstag“, Rotation zwischen Kindern, Ferienpausen und
   eindeutige Serienbearbeitung.

5. **Offline-fähige Kernfunktionen**  
   Kalender, Einkauf und Aufgaben bleiben ohne Verbindung lesbar. Änderungen
   werden später mit sichtbarer Konfliktauflösung synchronisiert.

### Priorität 2 – hoher Familiennutzen

1. **Morgen- und Abendroutinen für Kinder**  
   Bildbasierte Checklisten, Timer und kleine Serien-Badges ohne
   leistungsorientierten Druck.

2. **Familienrat**  
   Wünsche sammeln, gemeinsam abstimmen und Entscheidungen direkt mit einem
   Termin oder einer Aufgabe verbinden.

3. **Vorratskammer**  
   Häufige Artikel, Mindestbestand und automatische Einkaufsvorschläge aus dem
   Essensplan.

4. **Betreuungs- und Abholplan**  
   Wer bringt oder holt welches Kind; mit eindeutiger Übergabe,
   Konfliktwarnung und optionaler Erinnerung.

5. **Ruhezeiten und Benachrichtigungsregeln**  
   Meldungen nach Profil, Priorität, Kanal und Tageszeit bündeln.

### Optional

- WhatsApp nur über die offizielle WhatsApp Business Platform
- Sprach-Schnelleingabe in der Küche
- Geburtstags- und Geschenkideenliste
- Taschengeld mit freigegebenen Sparzielen
- Familienalbum aus erledigten Ausflügen und besonderen Momenten
- saisonale Haushalts-Checklisten
- CalDAV-/Google-/Outlook-Kalender-Synchronisation
- barrierearme Großelternansicht mit besonders großen Bedienelementen

## Produktprinzipien

- Kinder werden unterstützt, nicht überwacht.
- Private Inhalte werden bereits auf dem Server nach Profil gefiltert.
- Jede wichtige Aktion muss mobil mit höchstens wenigen Schritten erreichbar
  sein.
- Belohnungen bleiben positiv; Sterne fallen nie unter null.
- Integrationen sind optional, pro Profil steuerbar und vollständig trennbar.
- Inoffizielle Automatisierung persönlicher Messenger-Konten ist kein
  Produktionsweg.
