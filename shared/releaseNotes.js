const RELEASE_NOTES = {
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
