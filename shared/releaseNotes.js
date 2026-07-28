const RELEASE_NOTES = {
  '1.8.1': {
    version: '1.8.1',
    eyebrow: 'Das neue App-Symbol hat jetzt Luft',
    title: 'Keine abgeschnittenen Logo-Kanten mehr',
    intro:
      'Einige Android-Geräte vergrößern App-Symbole zusätzlich. Das LX-Motiv sitzt jetzt kleiner in einer großzügigen Sicherheitszone und bleibt bei runden, eckigen und herstellereigenen Formen vollständig sichtbar.',
    highlights: [
      {
        id: 'launcher-safe-area',
        title: 'Mehr Abstand zu allen Kanten',
        description:
          'Das eigentliche Kalender- und Familienmotiv wurde sauber auf 82 Prozent verkleinert.'
      },
      {
        id: 'adaptive-icon-masks',
        title: 'Für alle Android-Formen vorbereitet',
        description:
          'Runde Icons, Squircles und adaptive Launcher-Masken schneiden das Motiv nicht mehr an.'
      },
      {
        id: 'consistent-web-icon',
        title: 'Auch im Browser einheitlich',
        description:
          'Web-App, Startbildschirm und Android verwenden dieselbe neue Sicherheitszone.'
      },
      {
        id: 'icon-update-only',
        title: 'Familieninhalte bleiben unberührt',
        description:
          'Die Korrektur ändert nur Darstellung und App-Version – alle Daten und Einstellungen bleiben erhalten.'
      }
    ],
    closing:
      'Installiert Version 1.8.1 über die vorhandene App. Profile, Benachrichtigungen und Familieninhalte bleiben erhalten.'
  },
  '1.8.0': {
    version: '1.8.0',
    eyebrow: 'Kalender erinnert jetzt im richtigen Moment',
    title: 'Flexible Terminwecker und Müllabfuhr am Vortag',
    intro:
      'Für Termine lassen sich jetzt mehrere Erinnerungen wie in einem großen Kalender auswählen. Mülltermine erinnern automatisch einen Tag vorher, damit die richtige Tonne rechtzeitig draußen steht.',
    highlights: [
      {
        id: 'flexible-calendar-reminders',
        title: 'Mehrere Erinnerungen pro Termin',
        description:
          'Zum Beispiel 1 Tag, 1 Stunde und 10 Minuten vorher – einzeln oder gemeinsam.'
      },
      {
        id: 'trash-reminder-default',
        title: '„Morgen Hausmüll“ automatisch',
        description:
          'Neue, importierte und bereits vorhandene Abholtermine erinnern standardmäßig am Vortag.'
      },
      {
        id: 'trash-reminder-controls',
        title: 'Jede Abholung bleibt einstellbar',
        description:
          'Die Glocke am Mülltermin öffnet die Auswahl. Erinnerungen können geändert oder ganz ausgeschaltet werden.'
      },
      {
        id: 'new-family-app-icon',
        title: 'Neues LX-App-Symbol',
        description:
          'Haus, Kalender und Familie bilden jetzt ein klares gemeinsames Symbol auf Android und im Browser.'
      }
    ],
    closing:
      'Server und Android-App können normal aktualisiert werden. Alle Profile, Termine, Importe und Einstellungen bleiben erhalten.'
  },
  '1.7.7': {
    version: '1.7.7',
    eyebrow: 'Capacitor-Hänger gezielt behoben',
    title: 'Android kann die Push-Einrichtung jetzt wirklich abschließen',
    intro:
      'Die genaue Analyse hat einen offenen Fehler in Capacitor 8 sichtbar gemacht: Android-Pluginobjekte wurden versehentlich wie wartende Vorgänge behandelt und blieben deshalb bei „Android wird vorbereitet“ hängen. LX umgeht diesen Framework-Fehler jetzt sicher.',
    highlights: [
      {
        id: 'capacitor-thenable-workaround',
        title: 'Framework-Fehler sauber umgangen',
        description:
          'Das Android-Plugin wird nicht mehr selbst durch einen asynchronen Rückgabewert transportiert.'
      },
      {
        id: 'listeners-ready',
        title: 'Listener werden vollständig eingerichtet',
        description:
          'Benachrichtigungsempfang und Antippen einer Meldung können nun vor der Firebase-Anmeldung korrekt starten.'
      },
      {
        id: 'thenable-regression-test',
        title: 'Der konkrete Fehler ist getestet',
        description:
          'Ein automatischer Test bildet genau den fehlerhaften Capacitor-Proxy nach und verhindert eine spätere Rückkehr des Hängers.'
      },
      {
        id: 'direct-native-token-retained',
        title: 'Direkter Firebase-Weg bleibt aktiv',
        description:
          'Nach der Android-Vorbereitung liefert die native LX-Brücke den Geräteschlüssel direkt oder nennt die genaue Geräteursache.'
      }
    ],
    closing:
      'Installiert Version 1.7.7 über die vorhandene App. Profile, Anmeldung und Familiendaten bleiben erhalten.'
  },
  '1.7.6': {
    version: '1.7.6',
    eyebrow: 'Firebase antwortet jetzt direkt',
    title: 'LX holt den Android-Geräteschlüssel ohne Umweg',
    intro:
      'Die bisherige Android-Erweiterung meldete das Firebase-Ergebnis auf dem betroffenen Handy nicht zuverlässig an die Oberfläche zurück. Eine eigene native LX-Brücke liefert den Geräteschlüssel jetzt direkt und prüft vorher Firebase sowie die Google Play-Dienste.',
    highlights: [
      {
        id: 'direct-fcm-token',
        title: 'Direkte Firebase-Anmeldung',
        description:
          'Der Geräteschlüssel wird direkt im nativen Android-Code abgerufen und als Ergebnis an LX zurückgegeben.'
      },
      {
        id: 'play-services-diagnostics',
        title: 'Google Play wird geprüft',
        description:
          'Fehlende oder veraltete Google Play-Dienste werden sofort verständlich benannt.'
      },
      {
        id: 'real-fcm-errors',
        title: 'Echte Ursache statt Zeitablauf',
        description:
          'Firebase-Fehler und mögliche Netzwerkblockaden erscheinen direkt im Verbindungsbereich.'
      },
      {
        id: 'safe-upgrade-176',
        title: 'Daten bleiben erhalten',
        description:
          'Version 1.7.6 kann über die vorhandene App installiert werden; Profile, Anmeldung und Familieninhalte bleiben bestehen.'
      }
    ],
    closing:
      'Installiert Version 1.7.6 über die vorhandene LX App und startet die Push-Anmeldung danach erneut.'
  },
  '1.7.5': {
    version: '1.7.5',
    eyebrow: 'Android-Push ist direkt in der App verankert',
    title: 'Das Push-Modul muss nicht mehr nachgeladen werden',
    intro:
      'Die neue Diagnose hat gezeigt, dass einzelne Android-Geräte beim separaten Nachladen des Push-Moduls hängen bleiben. LX liefert dieses Modul jetzt fest mit der App aus und kann sofort darauf zugreifen.',
    highlights: [
      {
        id: 'bundled-native-push',
        title: 'Push-Modul sofort verfügbar',
        description:
          'Die Android-Funktion steckt direkt im Hauptprogramm und benötigt beim Einschalten keine zusätzliche interne Datei mehr.'
      },
      {
        id: 'no-runtime-module-load',
        title: 'Kein Ladehänger mehr',
        description:
          'Der auf dem betroffenen Handy eindeutig erkannte Modul-Ladeschritt wurde vollständig entfernt.'
      },
      {
        id: 'continued-stage-diagnostics',
        title: 'Diagnose bleibt aktiv',
        description:
          'Alle folgenden Schritte zeigen weiterhin ihren Status und brechen bei einer fehlenden Android-Antwort verständlich ab.'
      },
      {
        id: 'update-over-existing-app',
        title: 'Einfach darüber installieren',
        description:
          'Profile, Anmeldung und Familiendaten bleiben beim Update auf Version 1.7.5 erhalten.'
      }
    ],
    closing:
      'Installiert Version 1.7.5 über die vorhandene LX App und schaltet die Android-Benachrichtigungen danach erneut ein.'
  },
  '1.7.4': {
    version: '1.7.4',
    eyebrow: 'Android-Push zeigt jetzt genau, was passiert',
    title: 'Kein Verbindungsschritt kann mehr endlos hängen',
    intro:
      'LX überwacht jetzt den gesamten Android-Verbindungsweg – vom Start des Push-Moduls bis zum Speichern auf dem Familienserver. Statt eines endlosen Ladekreises seht ihr den aktuellen Schritt und bei einem Problem eine verständliche Ursache.',
    highlights: [
      {
        id: 'native-stage-status',
        title: 'Aktueller Schritt sichtbar',
        description:
          'Beim Einschalten steht direkt am Knopf, ob LX gerade Android, die Berechtigung, Firebase oder den Familienserver prüft.'
      },
      {
        id: 'native-all-stage-watchdogs',
        title: 'Jeder Schritt ist abgesichert',
        description:
          'Auch ein Hänger vor der eigentlichen Firebase-Anmeldung wird nun automatisch erkannt und beendet.'
      },
      {
        id: 'native-persistent-error',
        title: 'Fehler bleibt lesbar',
        description:
          'Die genaue Meldung bleibt unter dem Verbindungsbereich stehen und verschwindet nicht zusammen mit einer kurzen Einblendung.'
      },
      {
        id: 'native-safe-data',
        title: 'Familiendaten bleiben unverändert',
        description:
          'Das Update ändert nur die Android-Geräteanmeldung; Profile, Termine, Chats und Einstellungen bleiben erhalten.'
      }
    ],
    closing:
      'Installiert Version 1.7.4 einfach über die vorhandene LX App. Ein Löschen der App ist nicht nötig.'
  },
  '1.7.3': {
    version: '1.7.3',
    eyebrow: 'Push-Anmeldung bleibt nicht mehr hängen',
    title: 'LX gibt jetzt immer eine klare Rückmeldung',
    intro:
      'Wenn Android oder Google Play bei der Geräteanmeldung nicht antwortet, wartet LX nicht mehr endlos. Nach spätestens 20 Sekunden seht ihr die konkrete Ursache.',
    highlights: [
      {
        id: 'native-registration-watchdog',
        title: 'Kein endloses Verbinden',
        description:
          'Der Zeitwächter läuft jetzt unabhängig vom internen Android-Aufruf.'
      },
      {
        id: 'native-registration-result',
        title: 'Klare Rückmeldung',
        description:
          'Die Anmeldung ist entweder erfolgreich oder nennt nach spätestens 20 Sekunden den nächsten sinnvollen Prüfschritt.'
      },
      {
        id: 'stuck-plugin-test',
        title: 'Festhängen automatisch getestet',
        description:
          'Ein neuer Test bildet einen nativen Aufruf nach, der überhaupt nicht antwortet.'
      },
      {
        id: 'unchanged-family-data',
        title: 'Familiendaten bleiben unberührt',
        description:
          'Die Korrektur betrifft ausschließlich die Android-Geräteanmeldung.'
      }
    ],
    closing:
      'Die vorhandene App bitte direkt auf Version 1.7.3 aktualisieren; vorheriges Löschen ist nicht nötig.'
  },
  '1.7.2': {
    version: '1.7.2',
    eyebrow: 'Android-Push klar erkannt',
    title: 'LX zeigt jetzt immer den richtigen Verbindungsstatus',
    intro:
      'Der Familienserver meldet seine Firebase-Verbindung nun direkt beim Start der App. Ein Problem auf dem Handy kann deshalb nicht mehr wie eine fehlende Servereinrichtung aussehen.',
    highlights: [
      {
        id: 'bootstrap-firebase-status',
        title: 'Serverstatus direkt beim Start',
        description:
          'Die bereits funktionierende Familienverbindung liefert gleichzeitig den bestätigten Firebase-Status.'
      },
      {
        id: 'honest-push-errors',
        title: 'Verständliche Fehlermeldungen',
        description:
          'Falls das Handy den Push-Status nicht abrufen kann, zeigt LX die wirkliche Ursache statt eines falschen Firebase-Hinweises.'
      },
      {
        id: 'compatible-installation-id',
        title: 'Auch für ältere Android-WebViews',
        description:
          'Die lokale Gerätekennung funktioniert jetzt auch dann, wenn eine moderne Browserfunktion auf dem Handy noch fehlt.'
      },
      {
        id: 'retry-native-status',
        title: 'Direkt erneut prüfen',
        description:
          'In der Elternzentrale lässt sich die Verbindung nach einem Fehler mit einem Knopfdruck neu abfragen.'
      }
    ],
    closing:
      'Alle Profile, Inhalte und Einstellungen bleiben erhalten. Die Android-App muss einmal auf Version 1.7.2 aktualisiert werden.'
  },
  '1.7.1': {
    version: '1.7.1',
    eyebrow: 'Android-Push ist jetzt startklar',
    title: 'Die Firebase-Verbindung wird zuverlässig erkannt',
    intro:
      'LX prüft Server und Android-Berechtigung jetzt getrennt. Dadurch lässt sich die App auch dann sauber für Meldungen anmelden, wenn Android zunächst eine zusätzliche Rückfrage zeigt.',
    highlights: [
      {
        id: 'accurate-firebase-status',
        title: 'Kein falscher Firebase-Hinweis mehr',
        description:
          'Die Elternzentrale erkennt die eingerichtete Serververbindung unabhängig von der Berechtigungsabfrage des Handys.'
      },
      {
        id: 'fresh-native-status',
        title: 'Status wird frisch geladen',
        description:
          'Beim Öffnen der Benachrichtigungseinstellungen fragt LX den aktuellen Zustand erneut beim Familienserver ab.'
      },
      {
        id: 'android-permission-prompts',
        title: 'Android-Rückfragen funktionieren',
        description:
          'Auch Geräte, die vor der Freigabe noch einen zusätzlichen Hinweis anzeigen, öffnen anschließend den richtigen Systemdialog.'
      },
      {
        id: 'uncached-push-status',
        title: 'Immer der aktuelle Zustand',
        description:
          'LX übernimmt für die Benachrichtigungseinrichtung keine veraltete Serverantwort mehr aus dem Zwischenspeicher.'
      }
    ],
    closing:
      'Alle Familieninhalte und Einstellungen bleiben erhalten. Für diese Korrektur muss die Android-App einmal auf Version 1.7.1 aktualisiert werden.'
  },
  '1.7.0': {
    version: '1.7.0',
    eyebrow: 'Neu: echte Android-Benachrichtigungen',
    title: 'LX meldet sich jetzt auch im Hintergrund',
    intro:
      'Wichtige Familienmeldungen erreichen die Android-App jetzt als richtige Systembenachrichtigung – auch wenn LX gerade nicht geöffnet ist.',
    highlights: [
      {
        id: 'native-android-push',
        title: 'Meldungen auch bei geschlossener App',
        description:
          'Chatnachrichten, Termine, Erinnerungen und weitere wichtige Ereignisse erscheinen direkt in der Android-Benachrichtigungsleiste.'
      },
      {
        id: 'profile-notifications',
        title: 'Passend zum aktiven Profil',
        description:
          'Jedes Gerät wird mit dem gewählten Familienprofil verbunden. Die bekannten Benachrichtigungsschalter bestimmen weiterhin, was ankommen darf.'
      },
      {
        id: 'useful-categories',
        title: 'Dringendes ist klar erkennbar',
        description:
          'Kalender, Chat, Aufgaben, Problemmeldungen und das Befinden von Kindern erhalten passende Benachrichtigungskategorien und Prioritäten.'
      },
      {
        id: 'direct-navigation',
        title: 'Antippen und direkt nachsehen',
        description:
          'Ein Tipp auf eine Meldung öffnet LX und führt möglichst direkt zum betroffenen Bereich.'
      }
    ],
    closing:
      'Alle Familieninhalte und Einstellungen bleiben erhalten. Die Android-App muss für diese Funktion einmal aktualisiert werden.'
  },
  '1.6.0': {
    version: '1.6.0',
    eyebrow: 'Neu: eure eigene Family Cloud',
    title: 'LX Family und Nextcloud arbeiten jetzt zusammen',
    intro:
      'Kalender, Familienordner und verschlüsselte Sicherungen lassen sich direkt in der Elternzentrale verbinden – auf Wunsch mit einer mitgelieferten Nextcloud.',
    highlights: [
      {
        id: 'nextcloud-docker',
        title: 'Nextcloud einfach mitstarten',
        description:
          'Ein Hilfsskript richtet Nextcloud, Datenbank und Zwischenspeicher mit zufälligen Kennwörtern im vorhandenen Docker-Stack ein.'
      },
      {
        id: 'nextcloud-calendar',
        title: 'Kalender in beide Richtungen',
        description:
          'Neue, geänderte und gelöschte Termine werden automatisch abgeglichen. Bei gleichzeitigen Änderungen bleibt eine Konfliktkopie erhalten.'
      },
      {
        id: 'nextcloud-backup',
        title: 'Sichere Familienarchive',
        description:
          'Jede Familie erhält ein eigenes verschlüsseltes Cloud-Backup. Andere Familienkonten auf demselben Server werden nicht mitgesichert.'
      },
      {
        id: 'family-cloud-center',
        title: 'Alles verständlich an einem Ort',
        description:
          'Kalender, Profilzuordnung, Oma-und-Opa-Termine, Sicherungszeit und Verbindungsstatus werden in der neuen Family-Cloud-Karte verwaltet.'
      }
    ],
    closing:
      'Vorhandene Termine und Einstellungen bleiben erhalten; Nextcloud ist vollständig optional.'
  },
  '1.5.0': {
    version: '1.5.0',
    eyebrow: 'Neu für euren Heimserver',
    title: 'LX lässt sich jetzt besonders einfach auf Proxmox installieren',
    intro:
      'Für Proxmox VE gibt es jetzt einen geführten Installer mit sicheren Voreinstellungen, automatischem Docker-Setup und eigener Verwaltung.',
    highlights: [
      {
        id: 'pve-one-liner',
        title: 'Ein Befehl genügt',
        description:
          'Der neue Proxmox-Helper erstellt einen fertigen LX-Container und führt verständlich durch die Einrichtung.'
      },
      {
        id: 'pve-safe-container',
        title: 'Sicherer eigener Container',
        description:
          'LX läuft getrennt in einem unprivilegierten Debian-Container. Vorhandene Container werden nicht überschrieben.'
      },
      {
        id: 'pve-management',
        title: 'Einfache Verwaltung',
        description:
          'Updates, Backups, Status, Protokolle und die öffentliche Adresse lassen sich über ein gemeinsames LX-Kommando verwalten.'
      },
      {
        id: 'docker-apk-delivery',
        title: 'Android-App vollständig dabei',
        description:
          'Neue Docker- und Proxmox-Installationen liefern die signierte Android-App jetzt zuverlässig über Download und QR-Code aus.'
      }
    ],
    closing:
      'Bestehende Familieninhalte und Einstellungen bleiben beim normalen Update erhalten.'
  },
  '1.4.1': {
    version: '1.4.1',
    eyebrow: 'Kleine App-Verbesserung',
    title: 'Der QR-Code führt jetzt sicher zum richtigen Server',
    intro:
      'Der App-Download erkennt jetzt, ob LX über eure echte Adresse oder nur als lokale Vorschau geöffnet wurde.',
    highlights: [
      {
        id: 'public-qr-address',
        title: 'Richtige Download-Adresse',
        description:
          'Auf eurer öffentlichen Startseite führt der QR-Code direkt zur Android-App auf eurem LX-Server.'
      },
      {
        id: 'localhost-protection',
        title: 'Kein falscher Localhost-Code',
        description:
          'In einer lokalen Vorschau wird kein QR-Code mehr gezeigt, der auf dem Handy ins Leere führen würde.'
      },
      {
        id: 'home-network-qr',
        title: 'Funktioniert auch im Heimnetz',
        description:
          'Öffnet ihr LX über die Heimnetz-Adresse des Servers, kann diese Adresse direkt mit dem Handy gescannt werden.'
      },
      {
        id: 'configurable-public-url',
        title: 'Öffentliche Adresse fest einstellbar',
        description:
          'Der Server kann seine öffentliche LX-Adresse nun ausdrücklich für Downloads und QR-Codes verwenden.'
      }
    ],
    closing:
      'Der normale Download-Knopf bleibt auch in der lokalen Vorschau verfügbar.'
  },
  '1.4.0': {
    version: '1.4.0',
    eyebrow: 'Neu im Familienplaner',
    title: 'Die Familien-App ist da',
    intro:
      'LX lässt sich jetzt direkt von eurer Startseite als richtige Android-App installieren – ohne App-Store und passend zu eurem eigenen Server.',
    highlights: [
      {
        id: 'android-download',
        title: 'Direkter App-Download',
        description:
          'Auf der öffentlichen Startseite findet ihr einen klaren Download-Knopf mit aktueller Version und Dateigröße.'
      },
      {
        id: 'qr-download',
        title: 'Einfach per QR-Code',
        description:
          'Öffnet die Startseite am Computer, scannt den Code mit dem Handy und ladet die App direkt herunter.'
      },
      {
        id: 'signed-updates',
        title: 'Sicher signierte Updates',
        description:
          'Die Android-App wird dauerhaft mit demselben privaten Schlüssel signiert, damit spätere Versionen sauber über die bestehende App installiert werden können.'
      },
      {
        id: 'self-hosted-app',
        title: 'Bleibt bei euch',
        description:
          'APK, QR-Code und Download laufen über euren LX-Server. Ein externer App-Store ist nicht nötig.'
      }
    ],
    closing:
      'Alle Profile, Benachrichtigungen und Familiendaten bleiben erhalten.'
  },
  '1.3.1': {
    version: '1.3.1',
    eyebrow: 'Neu im Familienplaner',
    title: 'Nichts Wichtiges mehr verpassen',
    intro:
      'Benachrichtigungen begleiten jetzt den ganzen Familienalltag – gezielt für die richtigen Profile und ohne unnötige Meldungsflut.',
    highlights: [
      {
        id: 'notification-coverage',
        title: 'Mehr wichtige Meldungen',
        description:
          'Chat, Termine, Problemmeldungen, Gefühlslage der Kinder, Familiennetz, Schule, Belohnungen und Taschengeld melden sich jetzt zuverlässig.'
      },
      {
        id: 'calendar-changes',
        title: 'Kalender bleibt aktuell',
        description:
          'Neue, geänderte und abgesagte Termine sowie eure gewählten Erinnerungszeitpunkte erreichen automatisch die betroffenen Profile.'
      },
      {
        id: 'child-care',
        title: 'Kinder im Blick',
        description:
          'Erwachsene erfahren von neuen Gefühlslagen, erledigten Schulsachen, Tagesroutinen und Familienmissionen. „Brauche Nähe“ bleibt besonders dringend.'
      },
      {
        id: 'notification-control',
        title: 'Alles selbst einstellbar',
        description:
          'Jede Meldungsart lässt sich pro Profil und Gerät für Browser-Push sowie zentral für Gotify ein- oder ausschalten.'
      }
    ],
    closing:
      'Bestehende Geräte, Push-Einstellungen, Termine und alle anderen Familiendaten bleiben erhalten.'
  },
  '1.3.0': {
    version: '1.3.0',
    eyebrow: 'Neu im Familienplaner',
    title: 'Pünktlich sein, lecker teilen',
    intro:
      'Dieses Update erinnert euch rechtzeitig an Termine und bringt geteilte Rezepte ohne Umwege ins Familienkochbuch.',
    highlights: [
      {
        id: 'event-reminders',
        title: 'Mehrere Erinnerungen pro Termin',
        description:
          'Wählt zum Beispiel einen Tag, zehn Stunden, eine Stunde und zehn Minuten vorher. Jeder Termin kann seine eigenen Zeitpunkte bekommen.'
      },
      {
        id: 'reliable-alerts',
        title: 'Erinnerungen auch im Hintergrund',
        description:
          'Hinweise landen im Familien-Posteingang, als Web-Push und bei verbundener Einrichtung auch auf Gotify.'
      },
      {
        id: 'recipe-sharing',
        title: 'Von Chefkoch direkt zu LX',
        description:
          'Auf Android kann die installierte LX-App Rezept-Links aus Chefkoch, Pinterest und anderen Apps über das Teilen-Menü übernehmen.'
      },
      {
        id: 'safe-scheduling',
        title: 'Keine doppelten Wecker',
        description:
          'Der Server merkt sich bereits versendete Erinnerungen und holt nach einem Neustart nur den sinnvollsten noch offenen Hinweis nach.'
      }
    ],
    closing:
      'Alle vorhandenen Termine, Rezepte, Profile und Einstellungen bleiben erhalten.'
  },
  '1.2.0': {
    version: '1.2.0',
    eyebrow: 'Neu im Familienplaner',
    title: 'Mehr Überblick, mehr Familienzeit',
    intro:
      'Dieses Update macht euren Familienalltag leichter, persönlicher und auf allen Geräten angenehmer.',
    highlights: [
      {
        id: 'profiles',
        title: 'Mehr Platz für eure Familie',
        description:
          'Oma, Opa, betreute Personen und Haustiere lassen sich passend organisieren. Verbundene Familien können gemeinsam planen.'
      },
      {
        id: 'tasks',
        title: 'Faire Aufgaben & Belohnungen',
        description:
          'Erledigte Kinderaufgaben warten auf die Bestätigung eines Erwachsenen. Belohnungen können eigene Bilder und Symbole bekommen.'
      },
      {
        id: 'kids',
        title: 'Eine spannendere Kinderwelt',
        description:
          'Routinen, Sparziele, Taschengeld, Schule, Familienmissionen und freigegebene YouTube- oder Spotify-Kacheln sind direkt erreichbar.'
      },
      {
        id: 'food',
        title: 'Essen & Einkaufen ohne Umwege',
        description:
          'Der Einkauf bietet viele Standardprodukte. Rezepte lassen sich aus mehr Portalen übernehmen und verständlicher Schritt für Schritt kochen.'
      },
      {
        id: 'notifications',
        title: 'Nichts Wichtiges verpassen',
        description:
          'Benachrichtigungen werden pro Profil und Gerät verwaltet. Der Familien-Posteingang sammelt wichtige Hinweise an einem Ort.'
      },
      {
        id: 'home',
        title: 'Schöner, smarter, leichter',
        description:
          'Neue Themen, bessere Ansichten für Handy und Tablet, Home Assistant und der Knopf „Problem melden“ runden das Update ab.'
      }
    ],
    closing:
      'Alle bisherigen Termine, Aufgaben, Rezepte, Listen und Einstellungen bleiben erhalten.'
  }
};

export function releaseNotesForVersion(version) {
  return RELEASE_NOTES[String(version)] || {
    version: String(version || 'Neu'),
    eyebrow: 'Familienplaner aktualisiert',
    title: 'Eine neue Version ist da',
    intro:
      'Im Hintergrund wurden Funktionen verbessert und kleine Fehler behoben.',
    highlights: [],
    closing: 'Eure gespeicherten Inhalte und Einstellungen bleiben erhalten.'
  };
}
