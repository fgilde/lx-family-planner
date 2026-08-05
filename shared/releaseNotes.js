const RELEASE_NOTES = {
  '1.17.0': {
    version: '1.17.0',
    eyebrow: 'Mobile Navigation',
    title: 'Alle Bereiche auf einen Blick – auch auf dem Handy',
    intro:
      'Auf Handys und Tablets im Hochformat ersetzt eine ausklappbare Seitenleiste die bisherige horizontale Scroll-Leiste. Alle Bereiche sind sofort sichtbar, und nach der Auswahl klappt das Menü automatisch wieder zu.',
    highlights: [
      {
        id: 'mobile-nav-drawer',
        title: 'Menü auf einen Blick statt Scrollen',
        description:
          'Das neue ☰-Symbol oben klappt eine seitliche Leiste auf, in der alle Bereiche inklusive Badges sofort sichtbar sind – nichts mehr hinter einer Scrollbahn versteckt.'
      },
      {
        id: 'mobile-nav-autoclose',
        title: 'Schneller von Bereich zu Bereich',
        description:
          'Nach dem Antippen eines Punktes schließt das Menü automatisch, sodass der gewählte Bereich sofort sichtbar wird.'
      },
      {
        id: 'mobile-header-cleanup',
        title: 'Aufgeräumte Kopfzeile auf dem Handy',
        description:
          'Sprache, Theme, Server-Einstellungen und Abmelden sind auf schmalen Bildschirmen ins Menü gewandert. Oben bleiben nur Marke, Menü, Benachrichtigungen und das Profil.'
      },
      {
        id: 'mobile-nav-desktop-unchanged',
        title: 'Desktop bleibt, wie er ist',
        description:
          'Auf größeren Bildschirmen und Tablets im Querformat bleibt die gewohnte horizontale Leiste unverändert – dort funktioniert sie ja gut.'
      }
    ],
    closing:
      'Bestehende Familien, Profile, Termine, Aufgaben, Rezepte, Dateien und Einstellungen bleiben unverändert erhalten.',
    localizations: {
      en: {
        eyebrow: 'Mobile navigation',
        title: 'Every area at a glance – even on the phone',
        intro:
          'On phones and tablets in portrait, a slide-in drawer replaces the previous horizontal scrolling bar. All areas are visible at once, and the menu closes automatically after a selection.',
        highlights: [
          {
            id: 'mobile-nav-drawer',
            title: 'The menu at a glance instead of scrolling',
            description:
              'The new ☰ symbol at the top opens a side panel where every area including badges is visible immediately – nothing hidden behind a scroll bar anymore.'
          },
          {
            id: 'mobile-nav-autoclose',
            title: 'Faster from area to area',
            description:
              'After tapping an entry, the menu closes automatically so the chosen area is immediately visible.'
          },
          {
            id: 'mobile-header-cleanup',
            title: 'A tidy header on the phone',
            description:
              'Language, theme, server settings and logout have moved into the menu on narrow screens. The header keeps only the brand, menu, notifications and the profile.'
          },
          {
            id: 'mobile-nav-desktop-unchanged',
            title: 'Desktop stays as it is',
            description:
              'On larger screens and tablets in landscape, the familiar horizontal bar remains unchanged – it works well there.'
          }
        ],
        closing:
          'Existing families, profiles, events, chores, recipes, files and settings remain unchanged.'
      }
    }
  },
  '1.16.2': {
    version: '1.16.2',
    eyebrow: 'Benachrichtigungen, Wanddisplay und Profilrechte',
    title: 'Mehr Kontrolle über Mitteilungen, Tablet und Zugriffe',
    intro:
      'LX bekommt ntfy als weiteren Push-Kanal, ein sicheres Wanddisplay-Profil und feinere Profilrechte. Aufgaben lassen sich als gemeinsam markieren, und erwachsene Kinder erhalten die passenden Rechte.',
    highlights: [
      {
        id: 'ntfy-channel',
        title: 'ntfy als zusätzlicher Push-Kanal',
        description:
          'Neben Gotify lässt sich jetzt auch ntfy für Benachrichtigungen einrichten. Beide Kanäle können unabhängig voneinander genutzt werden.'
      },
      {
        id: 'wall-display-profile',
        title: 'Sicheres Wanddisplay-Profil',
        description:
          'Ein eigenes, schreibgeschütztes Profil erlaubt an einem geteilten Tablet nur Lesen und die beiden vorgesehenen Abhak-Aktionen. Einstellungen oder Profile können darüber nicht geändert werden.'
      },
      {
        id: 'tablet-task-bubbles-1162',
        title: 'Aufgaben am Tablet ohne Seitenwechsel',
        description:
          'Beim Abhaken einer Aufgabe fragt die Tabletansicht mit großen Profil-Bubbles, wer sie erledigt hat. Die Ansicht bleibt im Tabletmodus.'
      },
      {
        id: 'shared-chores',
        title: 'Gemeinsame Aufgaben mit fairen Sternen',
        description:
          'Aufgaben lassen sich als gemeinsam markieren. Sobald eine Person sie abhakt, gilt sie für den Tag für alle als erledigt; die Sterne erhält die Person, die es tatsächlich getan hat.'
      },
      {
        id: 'adult-child-roles',
        title: 'Erwachsene Kinder mit passenden Rechten',
        description:
          'Mit „Tochter (erwachsen)" und „Sohn (erwachsen)" gibt es eigene Positionen mit Familien-Admin-Rechten. Cloud- oder Briefkasten-Zugriff lässt sich außerdem pro Profil frei vergeben.'
      },
      {
        id: 'safe-profile-switch-1162',
        title: 'Sicherer Wechsel zum Kinderprofil',
        description:
          'Beim Wechsel von einem Erwachsenen- zu einem Kinderprofil schließen sich Cloud und Eltern-Bereiche sofort und die Ansicht springt zurück aufs Dashboard.'
      },
      {
        id: 'module-visibility-1162',
        title: 'Module gezielt ausblenden',
        description:
          'Briefkasten, Cloud und weitere Bereiche lassen sich global für die ganze Familie oder gezielt pro Profil ausblenden.'
      },
      {
        id: 'smart-trash-card',
        title: 'Müll-Kachel nur, wenn sie gebraucht wird',
        description:
          'Die Müllabfuhr-Kachel kann auf immer, nie oder nur eine einstellbare Anzahl Tage vor der nächsten Abholung erscheinen.'
      }
    ],
    closing:
      'Bestehende Familien, Profile, Termine, Aufgaben, Rezepte, Dateien und Einstellungen bleiben unverändert erhalten.',
    localizations: {
      en: {
        eyebrow: 'Notifications, wall display and profile permissions',
        title: 'More control over notifications, the tablet and access',
        intro:
          'LX adds ntfy as another push channel, a safe wall display profile and finer profile permissions. Chores can be marked as shared, and adult children receive the right permissions.',
        highlights: [
          {
            id: 'ntfy-channel',
            title: 'ntfy as an additional push channel',
            description:
              'Alongside Gotify, ntfy can now also be set up for notifications. Both channels can be used independently.'
          },
          {
            id: 'wall-display-profile',
            title: 'Safe wall display profile',
            description:
              'A dedicated read-only profile allows only reading and the two intended check-off actions on a shared tablet. Settings or profiles cannot be changed from it.'
          },
          {
            id: 'tablet-task-bubbles-1162',
            title: 'Complete chores on the tablet without leaving',
            description:
              'When checking off a chore, the tablet view asks with large profile bubbles who completed it, and stays in tablet mode.'
          },
          {
            id: 'shared-chores',
            title: 'Shared chores with fair stars',
            description:
              'Chores can be marked as shared. As soon as one person completes it, it counts as done for everyone that day, while the stars go to whoever actually did it.'
          },
          {
            id: 'adult-child-roles',
            title: 'Adult children with the right permissions',
            description:
              '“Tochter (erwachsen)" and “Sohn (erwachsen)" are dedicated positions with family-admin rights. Cloud or mailbox access can also be granted per profile.'
          },
          {
            id: 'safe-profile-switch-1162',
            title: 'Safe switch to a child profile',
            description:
              'When switching from an adult to a child profile, the cloud and parent areas close immediately and the view returns to the dashboard.'
          },
          {
            id: 'module-visibility-1162',
            title: 'Hide modules where they are not needed',
            description:
              'Mailbox, cloud and other areas can be hidden globally for the whole family or per profile.'
          },
          {
            id: 'smart-trash-card',
            title: 'Waste card only when it is needed',
            description:
              'The waste-collection card can be set to always, never, or only a configurable number of days before the next pickup.'
          }
        ],
        closing:
          'Existing families, profiles, events, chores, recipes, files and settings remain unchanged.'
      }
    }
  },
  '1.16.1': {
    version: '1.16.1',
    eyebrow: 'Hotfix für die Android-App',
    title: 'Teilen aus My Recipe Box funktioniert jetzt direkt',
    intro:
      'LX erscheint nun beim Teilen eines RTK-Backups und hält die Sprachwahl auch auf schmalen Handybildschirmen vollständig sichtbar.',
    highlights: [
      {
        id: 'android-rtk-share',
        title: 'RTK-Dateien direkt an LX teilen',
        description:
          'Exportiere dein Backup in My Recipe Box und wähle im Android-Teilen-Menü LX Family Planner. Rezepte und vorhandene Bilder werden anschließend automatisch übernommen.'
      },
      {
        id: 'mobile-language-switcher',
        title: 'Deutsch und Englisch gut erkennbar',
        description:
          'DE oder EN steht nun direkt im Kopfbereich. Das Auswahlmenü bleibt auch auf kleinen Displays vollständig innerhalb des Bildschirms.'
      }
    ],
    closing:
      'Eure Familien, Profile, Rezepte, Termine, Dateien und Einstellungen bleiben unverändert erhalten.',
    localizations: {
      en: {
        eyebrow: 'Android app hotfix',
        title: 'Share directly from My Recipe Box',
        intro:
          'LX now appears when sharing an RTK backup, while the language selector stays fully visible on narrow phone screens.',
        highlights: [
          {
            id: 'android-rtk-share',
            title: 'Share RTK files directly to LX',
            description:
              'Export a backup in My Recipe Box and choose LX Family Planner from the Android share sheet. Recipes and available images are imported automatically.'
          },
          {
            id: 'mobile-language-switcher',
            title: 'English and German remain readable',
            description:
              'EN or DE is visible in the header, and the selection menu stays completely inside small screens.'
          }
        ],
        closing:
          'Your families, profiles, recipes, events, files and settings remain unchanged.'
      }
    }
  },
  '1.16.0': {
    version: '1.16.0',
    eyebrow: 'Mehr Familie, weniger doppelte Pflege',
    title: 'Geburtstage, Team-Aufgaben und ein flexibleres Kochbuch',
    intro:
      'LX denkt jetzt an Familiengeburtstage, verteilt gemeinsame Aufgaben fair und lässt Rezepte endlich vollständig bearbeiten oder aus Tandoor übernehmen.',
    highlights: [
      {
        id: 'family-birthdays',
        title: 'Geburtstage automatisch im Kalender',
        description:
          'Jedes Profil kann ein Geburtsdatum speichern. Der Geburtstag erscheint jedes Jahr von selbst im Familienkalender; LX erinnert eine Woche vorher und am Geburtstag.'
      },
      {
        id: 'safe-family-onboarding',
        title: 'Familien können sich nicht mehr aussperren',
        description:
          'Beim ersten Einrichten achtet LX darauf, dass mindestens ein Erwachsenenprofil die Familie verwalten kann. Bereits betroffene Familien mit einem normalen Haushaltsprofil werden beim Update automatisch repariert.'
      },
      {
        id: 'shared-tasks',
        title: 'Gemeinsame Aufgaben mit fairen Sternen',
        description:
          'Mehrere Personen können dieselbe Aufgabe übernehmen. Die Sterne erhält wirklich die Person, die sie erledigt hat; bei Kindern bleibt die Bestätigung durch die Eltern erhalten.'
      },
      {
        id: 'tablet-task-bubbles',
        title: 'Aufgaben direkt am Tablet abhaken',
        description:
          'Nach dem Antippen fragt die Tabletansicht mit großen Profilbildern, wer die Aufgabe erledigt hat. Die Ansicht bleibt dabei im Tabletmodus.'
      },
      {
        id: 'recipe-editor-tandoor',
        title: 'Rezepte bearbeiten und aus Tandoor importieren',
        description:
          'Zutaten und Zubereitungsschritte lassen sich ergänzen, ändern oder entfernen. Offizielle Tandoor-Exporte werden inklusive vorhandener Bilder eingelesen.'
      },
      {
        id: 'facebook-recipe-drafts',
        title: 'Facebook-Reels als sicheren Rezeptentwurf teilen',
        description:
          'Öffentliche Reels können aus Android direkt an LX geteilt werden. Beschreibung und Original-Rezeptlink werden gelesen; gespeichert wird erst, nachdem jemand den Entwurf geprüft hat.'
      },
      {
        id: 'birthday-dashboard-preview',
        title: 'Geburtstage ohne doppelte Jahresvorschau',
        description:
          'Auf dem Dashboard erscheint pro Person nur der nächste anstehende Geburtstag. Weitere Jahre bleiben im Kalender erhalten, überladen aber nicht mehr die Startseite.'
      },
      {
        id: 'calm-custom-themes',
        title: 'Ruhige Designs und ein eigenes sicheres Theme',
        description:
          'Neue schlichte Themes kommen ohne Motive aus. Eigene Farben und Rundungen werden als separates Design gespeichert, ohne vorhandene Themes zu überschreiben.'
      },
      {
        id: 'smart-trash-widget',
        title: 'Müll-Kachel nur dann, wenn sie gebraucht wird',
        description:
          'Pro Profil und Gerät lässt sich einstellen, ob die Müllabfuhr immer, nie oder nur einige Tage vor der nächsten Abholung erscheint.'
      },
      {
        id: 'language-switcher',
        title: 'Deutsch und Englisch mit einem Klick',
        description:
          'Die Sprache lässt sich vor der Anmeldung oder direkt in der Kopfzeile wechseln. LX merkt sich die Auswahl auf diesem Gerät.'
      }
    ],
    closing:
      'Bestehende Familien, Profile, Termine, Aufgaben, Rezepte, Dateien und Einstellungen bleiben unverändert erhalten.',
    localizations: {
      en: {
        eyebrow: 'More family life, less duplicate work',
        title: 'Birthdays, team chores and a more flexible recipe book',
        intro:
          'LX now remembers family birthdays, shares chores fairly and lets you maintain or import complete recipes.',
        highlights: [
          {
            id: 'family-birthdays',
            title: 'Birthdays appear automatically',
            description:
              'Each profile can store a birthday. It returns in the family calendar every year, with a reminder one week before and on the day.'
          },
          {
            id: 'safe-family-onboarding',
            title: 'Families cannot lock themselves out',
            description:
              'Initial setup keeps at least one adult profile able to manage the family. Affected existing households are repaired during the update.'
          },
          {
            id: 'shared-tasks',
            title: 'Shared chores with fair stars',
            description:
              'Several people can take the same chore. Stars go to whoever completed it; children still need an adult approval.'
          },
          {
            id: 'tablet-task-bubbles',
            title: 'Complete chores from the tablet',
            description:
              'Large profile bubbles ask who completed a shared chore without leaving tablet mode.'
          },
          {
            id: 'recipe-editor-tandoor',
            title: 'Edit recipes and import from Tandoor',
            description:
              'Ingredients and preparation steps can be added, changed or removed. Official Tandoor exports include available images.'
          },
          {
            id: 'facebook-recipe-drafts',
            title: 'Share Facebook Reels as reviewable drafts',
            description:
              'Public Reels can be shared from Android. LX reads the description and original recipe link, but saves only after someone reviews the draft.'
          },
          {
            id: 'birthday-dashboard-preview',
            title: 'A clean birthday preview',
            description:
              'The dashboard shows only the next birthday for each person instead of duplicating future years.'
          },
          {
            id: 'calm-custom-themes',
            title: 'Calm designs and a safe custom theme',
            description:
              'New motif-free themes are joined by a separate custom design for approved colours and shapes, without overwriting built-in themes.'
          },
          {
            id: 'smart-trash-widget',
            title: 'Waste collection only when relevant',
            description:
              'Each profile and device can show the waste card always, never or only shortly before collection.'
          },
          {
            id: 'language-switcher',
            title: 'English and German in one tap',
            description:
              'Choose the interface language before login or from the main header. LX remembers the choice on this device.'
          }
        ],
        closing:
          'Existing families, profiles, events, chores, recipes, files and settings remain unchanged.'
      }
    }
  },
  '1.15.0': {
    version: '1.15.0',
    eyebrow: 'Termine und Schulalltag lassen sich jetzt richtig planen',
    title: 'Ein Kalender für die ganze Familie',
    intro:
      'Termine können wieder geöffnet und vollständig bearbeitet werden. Außerdem darf ein Termin jetzt mehreren Personen gehören.',
    highlights: [
      {
        id: 'calendar-event-editor',
        title: 'Termine öffnen und bearbeiten',
        description:
          'Ein Klick auf einen Termin öffnet alle Details. Titel, Zeit, Ort, Notizen, Erinnerungen und Personen lassen sich ändern; eigene Termine können auch gelöscht werden.'
      },
      {
        id: 'calendar-multiple-members',
        title: 'Mehrere Personen pro Termin',
        description:
          'Elternabend, Ausflug oder Arztbesuch können gezielt für mehrere Familienmitglieder eingetragen werden – ohne den Termin doppelt anzulegen.'
      },
      {
        id: 'child-timetable',
        title: 'Eigener Stundenplan für Kinder',
        description:
          'Eltern können den Schulbereich pro Kind einschalten und einen Wochenplan mit Fach, Stunde, Uhrzeit, Raum und Lehrkraft pflegen. Einmaliger Unterrichtsausfall wird deutlich rot markiert.'
      },
      {
        id: 'mobile-recipe-actions',
        title: 'Rezeptbuch auf kleinen Handys aufgeräumt',
        description:
          'Die Aktionen zum Anzeigen, Importieren und Anlegen von Rezepten bleiben auch auf schmalen Bildschirmen vollständig erreichbar.'
      }
    ],
    closing:
      'Bestehende Familien, Termine, Kalenderquellen, Profile und Einstellungen bleiben beim Update erhalten.'
  },
  '1.14.3': {
    version: '1.14.3',
    eyebrow: 'Die öffentliche Demo ist jetzt strikt abgeschottet',
    title: 'Cloud und Integrationen bleiben privat',
    intro:
      'Das Demo-Konto kann keine Cloud-Dateien, Zugangsdaten oder angebundenen Dienste mehr öffnen.',
    highlights: [
      {
        id: 'demo-cloud-isolation',
        title: 'Keine Cloud im Demo-Konto',
        description:
          'Cloud-Navigation, Dateien, Ordner, Sicherungen und Zugangsdaten sind für öffentliche Demo-Sitzungen vollständig gesperrt.'
      },
      {
        id: 'demo-integration-isolation',
        title: 'Anbindungen bleiben unsichtbar',
        description:
          'Auch Home Assistant, Bring, Gotify und Geräteinformationen werden der Demo nicht mehr bereitgestellt.'
      },
      {
        id: 'real-families-unchanged',
        title: 'Eure Familien bleiben getrennt',
        description:
          'Private Familien behalten ihre eigenen Cloud-Konten und sämtliche gespeicherten Inhalte.'
      }
    ],
    closing:
      'Der öffentliche Rundgang bleibt möglich, sensible Anbindungen sind darin ab jetzt grundsätzlich ausgeschlossen.'
  },
  '1.14.2': {
    version: '1.14.2',
    eyebrow: 'Das sichere Update läuft wieder zuverlässig',
    title: 'Neutrale Anmeldung und geschützte Familieninhalte',
    intro:
      'LX verrät bei der Anmeldung keinen Familiennamen mehr und kann dieses Sicherheitsupdate jetzt zuverlässig über Docker einspielen.',
    highlights: [
      {
        id: 'neutral-family-login',
        title: 'Kein echter Familienname als Hinweis',
        description:
          'Im Anmeldefeld steht nur noch eine neutrale Aufforderung. Private Familien werden weder aufgelistet noch vorgeschlagen.'
      },
      {
        id: 'safe-docker-update',
        title: 'Sicherung vor jedem Update',
        description:
          'Der Docker-Updateweg kann die Familiendaten wieder sichern und prüfen, bevor die neue Version startet.'
      }
    ],
    closing:
      'Eure drei Familienkonten, Profile, Einstellungen und gespeicherten Inhalte bleiben unverändert.'
  },
  '1.14.1': {
    version: '1.14.1',
    eyebrow: 'Ein kleines Detail schützt euren Zugang besser',
    title: 'Die Anmeldung bleibt jetzt vollständig neutral',
    intro:
      'Im Eingabefeld für den Familiennamen wird kein konkreter Familienname mehr als Beispiel gezeigt.',
    highlights: [
      {
        id: 'neutral-family-login',
        title: 'Kein Kontoname als Beispiel',
        description:
          'Die Anmeldung fordert nur noch neutral zur Eingabe auf. Private Familiennamen werden weder aufgelistet noch als Hinweis vorgeschlagen.'
      },
      {
        id: 'public-demo-exception',
        title: 'Die Demo bleibt klar erkennbar',
        description:
          'Nur das ausdrücklich freigegebene, schreibgeschützte Demo-Konto darf weiterhin öffentlich angeboten werden.'
      }
    ],
    closing:
      'An euren Familienkonten, Passwörtern und gespeicherten Inhalten ändert sich nichts.'
  },
  '1.14.0': {
    version: '1.14.0',
    eyebrow: 'Mehr Überblick, ohne euch einzuschränken',
    title: 'Aufgaben, Termine und Bereiche passen sich euch an',
    intro:
      'LX lässt sich jetzt besser auf eure Familie zuschneiden. Aufgaben können korrigiert werden, Termine dürfen mehrere Tage dauern und nicht benötigte Bereiche verschwinden auf Wunsch.',
    highlights: [
      {
        id: 'editable-tasks',
        title: 'Aufgaben bearbeiten und einzeln löschen',
        description:
          'Titel, Beschreibung, Person, Fälligkeit, Wiederholung und Sterne lassen sich nachträglich ändern. Eine einzelne Aufgabe kann mit Sicherheitsabfrage entfernt werden.'
      },
      {
        id: 'calendar-duration',
        title: 'Ganztägige und mehrtägige Termine',
        description:
          'Urlaub, Klassenfahrt oder Besuch können als ganzer Tag, mit Uhrzeit oder über mehrere Tage eingetragen werden.'
      },
      {
        id: 'module-visibility',
        title: 'Nur die Bereiche, die ihr braucht',
        description:
          'Erwachsene können Funktionen für die ganze Familie oder gezielt für einzelne Profile ein- und ausblenden.'
      },
      {
        id: 'safe-profile-switch',
        title: 'Sicherer Profilwechsel',
        description:
          'Beim Wechsel zu einem Kind oder Haustier schließt LX geschützte Ansichten sofort und öffnet das passende Dashboard.'
      },
      {
        id: 'unraid-start',
        title: 'Zuverlässiger Start unter Unraid',
        description:
          'Der Container richtet seine Datenordner beim Start korrekt ein. Unsichere Vollzugriffsrechte sind nicht mehr nötig.'
      }
    ],
    closing:
      'Vorhandene Familien, Termine, Aufgaben, Dateien und Einstellungen bleiben beim Update vollständig erhalten.'
  },
  '1.13.2': {
    version: '1.13.2',
    eyebrow: 'Euer Familienraum bleibt jetzt wirklich privat',
    title: 'Sichere Anmeldung und kontrollierte Registrierung',
    intro:
      'Familiennamen werden vor der Anmeldung nicht mehr öffentlich aufgelistet. Neue Familien kommen nur noch kontrolliert auf den eigenen Server.',
    highlights: [
      {
        id: 'private-family-login',
        title: 'Keine öffentliche Familienliste mehr',
        description:
          'Zur Anmeldung werden Familienname und Familienpasswort selbst eingegeben. Andere Familienkonten bleiben unsichtbar.'
      },
      {
        id: 'first-family-registration',
        title: 'Nach der ersten Familie automatisch geschlossen',
        description:
          'Eine frische Installation lässt die erste Einrichtung zu und sperrt danach weitere freie Registrierungen.'
      },
      {
        id: 'invite-only-registration',
        title: 'Weitere Familien nur mit Einladung',
        description:
          'Serverbetreiber können bei Bedarf einen persönlichen Einladungscode für kontrollierte neue Konten aktivieren.'
      },
      {
        id: 'demo-remains-public',
        title: 'Die öffentliche Demo bleibt leicht erreichbar',
        description:
          'Eine ausdrücklich eingerichtete Nur-Lese-Demo darf weiterhin auf der Startseite erscheinen, private Familien dagegen nicht.'
      },
      {
        id: 'stronger-new-passwords',
        title: 'Stärkere neue Familienpasswörter',
        description:
          'Neu angelegte oder geänderte Familienpasswörter benötigen jetzt mindestens zehn Zeichen.'
      }
    ],
    closing:
      'Bestehende Familieninhalte bleiben unverändert. Der Server schützt nur Anmeldung und Neuregistrierung deutlich strenger.'
  },
  '1.13.1': {
    version: '1.13.1',
    eyebrow: 'LX zeigt jetzt, wo es gemeinsam weitergeht',
    title: 'Das öffentliche Projekt ist direkt in LX erreichbar',
    intro:
      'Wer LX gerne nutzt, findet das öffentliche GitHub-Projekt jetzt ohne Suche. Dort könnt ihr einen Stern dalassen, Ideen verfolgen oder selbst mitmachen.',
    highlights: [
      {
        id: 'github-welcome-link',
        title: 'GitHub direkt auf der Startseite',
        description:
          'Eine ruhige Open-Source-Karte führt neue und wiederkehrende Familien direkt zum öffentlichen LX-Projekt.'
      },
      {
        id: 'github-settings-link',
        title: 'Auch später leicht wiederzufinden',
        description:
          'In der Familienverwaltung steht der Projektlink dauerhaft neben der installierten Versionsnummer.'
      },
      {
        id: 'theme-safe-github-card',
        title: 'Passend zu hellen und dunklen Themen',
        description:
          'Die neue Karte verwendet die jeweilige Themenwelt und bleibt auf Handy, Tablet und Desktop gut lesbar.'
      },
      {
        id: 'github-link-only',
        title: 'Keine Familiendaten werden geteilt',
        description:
          'Der Verweis öffnet nur das öffentliche Repository. Profile, Termine und Einstellungen bleiben vollständig auf eurem Server.'
      }
    ],
    closing:
      'Die Verweise öffnen ausschließlich das öffentliche GitHub-Repository. Familieninhalte und Einstellungen werden dabei nicht übertragen.'
  },
  '1.13.0': {
    version: '1.13.0',
    eyebrow: 'Die Medien-Lounge bekommt ein Gesicht',
    title: 'YouTube und Spotify zeigen jetzt ihre echten Cover',
    intro:
      'Freigegebene Medien sehen für Kinder jetzt wie eine echte kleine Mediathek aus. Statt großer Plattform-Symbole zeigt LX das passende Kanal-, Video-, Playlist- oder Album-Bild.',
    highlights: [
      {
        id: 'real-media-covers',
        title: 'Echte Bilder statt Standardsymbol',
        description:
          'Die Kacheln verwenden das offizielle Vorschaubild des verknüpften YouTube- oder Spotify-Inhalts.'
      },
      {
        id: 'existing-widget-covers',
        title: 'Vorhandene Widgets werden ergänzt',
        description:
          'Bereits freigegebene Medienlinks erhalten ihre Cover automatisch im Hintergrund. Die Eltern müssen sie nicht neu anlegen.'
      },
      {
        id: 'cover-first-kid-design',
        title: 'Wie eine kleine Mediathek',
        description:
          'Großflächige Cover, ein ruhiger Lesekontrast und eine klare Abspielschaltfläche machen die Kinderansicht aufregender und trotzdem übersichtlich.'
      },
      {
        id: 'safe-cover-sources',
        title: 'Nur geprüfte Bildquellen',
        description:
          'LX akzeptiert ausschließlich verschlüsselte Bildadressen der offiziellen YouTube- und Spotify-Bildserver.'
      }
    ],
    closing:
      'Wenn ein Dienst vorübergehend kein Bild liefert, bleibt die Kachel mit einem farbigen, gut lesbaren Ersatzmotiv benutzbar.'
  },
  '1.12.1': {
    version: '1.12.1',
    eyebrow: 'Chatbilder sind jetzt wirklich Cloud-Dateien',
    title: 'Fotos landen zuverlässig im Familienarchiv',
    intro:
      'Auch ältere App- und Browserstände werden jetzt automatisch auf den sicheren Cloud-Weg umgeleitet. Bereits vorhandene Chatfotos räumt LX selbstständig nachträglich ins Familienarchiv.',
    highlights: [
      {
        id: 'legacy-photo-cloud-archive',
        title: 'Kein Foto bleibt mehr im Chatdatensatz',
        description:
          'Eingebettete Bilder werden als echte Dateien unter Familie/Chat gespeichert. Die Nachricht behält nur noch den geschützten Verweis.'
      },
      {
        id: 'existing-photo-migration',
        title: 'Vorhandene Bilder werden nachgeräumt',
        description:
          'Beim Serverstart verschiebt LX bisher eingebettete Chatbilder automatisch in die Cloud, ohne den Verlauf oder die Bildanzeige zu verlieren.'
      },
      {
        id: 'chat-image-lightbox',
        title: 'Antippen und groß ansehen',
        description:
          'Ein Tipp auf ein Chatbild öffnet eine große, übersichtliche Bildansicht mit Download – passend für Handy, Tablet und Desktop.'
      },
      {
        id: 'private-photo-protection',
        title: 'Private Bilder bleiben privat',
        description:
          'Fotos in Direktnachrichten werden wie andere private Anhänge verschlüsselt abgelegt und nur im passenden Chat entschlüsselt.'
      }
    ],
    closing:
      'Die Reparatur arbeitet im Hintergrund. Familieninhalte und bereits gespeicherte Cloud-Dateien bleiben unverändert.'
  },
  '1.12.0': {
    version: '1.12.0',
    eyebrow: 'Updates in der App und ein aufgeräumter Datei-Alltag',
    title: 'Chat-Dateien landen jetzt sicher in eurem Familienarchiv',
    intro:
      'LX behandelt Anhänge nicht länger wie riesige Chattexte. Fotos, Videos und Dokumente werden als echte Dateien in der Family Cloud gespeichert – ordentlich sortiert und weiterhin direkt im Chat erreichbar.',
    highlights: [
      {
        id: 'native-update-flow',
        title: 'App-Update wieder direkt in LX',
        description:
          'Beim Öffnen prüft die Android-App ihre Version. Ein neuer Installationsdialog lädt das geprüfte Update und übergibt es anschließend direkt an Android.'
      },
      {
        id: 'chat-cloud-attachments',
        title: 'Anhänge gehören in die Cloud',
        description:
          'Neue Chat-Anhänge werden automatisch nach Monat im Familienarchiv abgelegt. Der Verlauf bleibt dadurch schnell und vorhandene Chatfotos bleiben erhalten.'
      },
      {
        id: 'chat-more-file-types',
        title: 'Mehr als nur Fotos',
        description:
          'Neben Bildern funktionieren jetzt Videos, Audio, PDF- und Office-Dokumente, Archive wie ZIP sowie Android-APKs – mehrere Dateien pro Nachricht und bis 100 MB je Datei.'
      },
      {
        id: 'cloud-folder-choice',
        title: 'Vor dem Upload den Ordner wählen',
        description:
          'Dashboard-Uploads fragen zuerst nach dem Ziel. Ein neuer Ordner lässt sich direkt in derselben Auswahl anlegen; lose Dateien im Stammverzeichnis verhindert LX.'
      },
      {
        id: 'cloud-family-profile-folders',
        title: 'Familien- und Profilordner',
        description:
          'LX bereitet einen gemeinsamen Bereich sowie einen persönlichen Ordner für jedes echte Nutzerprofil vor. Chat-Dateien liegen übersichtlich im gemeinsamen Familienbereich.'
      }
    ],
    closing:
      'Für das Android-Update fragt das Handy einmalig, ob LX selbst geladene Updates installieren darf. Familieninhalte, Einstellungen und bereits vorhandene Dateien bleiben unverändert.'
  },
  '1.11.0': {
    version: '1.11.0',
    eyebrow: 'Euer Familienarchiv bekommt seinen eigenen Platz',
    title: 'Fotos und Dokumente fühlen sich jetzt wie ein echtes Archiv an',
    intro:
      'Family Cloud war bisher eine Mischung aus Dateien und technischen Einstellungen. Jetzt ist sie ein übersichtlicher Familienbereich zum Stöbern, Ordnen und Hochladen.',
    highlights: [
      {
        id: 'cloud-pure-archive',
        title: 'Nur noch eure Inhalte',
        description:
          'Auf der Seite Family Cloud seht ihr ausschließlich Dateien, Ordner, Speicher und die passenden Aktionen – keine Serverformulare mehr.'
      },
      {
        id: 'cloud-dashboard-upload',
        title: 'Upload direkt vom Dashboard',
        description:
          'Die neue Archiv-Kachel zeigt den Speicherstand und zuletzt verwendete Inhalte. Fotos oder Dokumente lassen sich dort sofort hochladen.'
      },
      {
        id: 'cloud-gallery-list',
        title: 'Galerie oder übersichtliche Liste',
        description:
          'Bilder bekommen Vorschaubilder, Ordner sehen wie Sammlungen aus und die Ansicht lässt sich jederzeit umschalten oder durchsuchen.'
      },
      {
        id: 'cloud-settings-parent-admin',
        title: 'Technik bleibt bei den Erwachsenen',
        description:
          'Verbindung, Kalenderabgleich, Sicherungen und Zugangsdaten liegen jetzt gesammelt in der Elternzentrale.'
      },
      {
        id: 'cloud-no-login-detour',
        title: 'Kein unerwarteter Nextcloud-Login',
        description:
          'Der alte externe Familienordner-Link wurde entfernt. Das Archiv öffnet sich vollständig innerhalb von LX.'
      }
    ],
    closing:
      'Am Speicher und an euren vorhandenen Dateien wurde nichts verändert. Das Update ordnet nur die Bedienung neu und macht das gemeinsame Archiv deutlich angenehmer.'
  },
  '1.10.2': {
    version: '1.10.2',
    eyebrow: 'Family Cloud repariert sich jetzt selbst',
    title: 'Gelöschte Cloud-Konten bleiben nicht mehr hängen',
    intro:
      'War in LX noch eine alte Cloud-Verknüpfung gespeichert, obwohl das zugehörige Nextcloud-Konto bereits gelöscht wurde, konnte kein Familienordner geöffnet werden. LX erkennt und behebt diesen Zustand nun automatisch.',
    highlights: [
      {
        id: 'cloud-managed-health-check',
        title: 'Alte Verknüpfungen werden geprüft',
        description:
          'LX kontrolliert verwaltete Familienkonten beim Start und danach regelmäßig, statt eine gespeicherte Verbindung blind als funktionsfähig anzusehen.'
      },
      {
        id: 'cloud-account-self-heal',
        title: 'Familienkonto wird wiederhergestellt',
        description:
          'Fehlt das Konto, entstehen automatisch ein neuer sicherer Zugang, der Familienordner, der Kalender und das vorgesehene Speicherlimit.'
      },
      {
        id: 'cloud-external-safe',
        title: 'Eigene Clouds bleiben unangetastet',
        description:
          'Die Reparatur gilt ausschließlich für die von LX selbst verwaltete Family Cloud. Manuell verbundene Nextcloud-Server werden nicht verändert.'
      },
      {
        id: 'cloud-no-extra-login',
        title: 'Keine zusätzlichen Anmeldungen',
        description:
          'Familienmitglieder öffnen den gemeinsamen Cloud-Bereich weiter direkt in LX und brauchen dafür kein eigenes Nextcloud-Passwort.'
      }
    ],
    closing:
      'Die Profile einer Familie verwenden weiterhin gemeinsam ihren abgeschotteten Familienbereich. Es sind keine zusätzlichen Nextcloud-Passwörter für Kinder oder verwaltete Profile nötig.'
  },
  '1.10.1': {
    version: '1.10.1',
    eyebrow: 'Family Cloud ohne manuellen Einrichtungsschritt',
    title: 'Jede Familie bekommt ihren Cloud-Bereich automatisch',
    intro:
      'Die mitgestartete Nextcloud war erreichbar, hat Familienkonten aber bisher erst nach einem zusätzlichen Klick angelegt. LX richtet bestehende und neue Familien jetzt selbstständig vollständig ein.',
    highlights: [
      {
        id: 'cloud-auto-account',
        title: 'Automatisches Familienkonto',
        description:
          'Jede Familie erhält ein eigenes, getrenntes Nextcloud-Konto – vorhandene Familien direkt nach dem Update und neue Familien bei der Anmeldung.'
      },
      {
        id: 'cloud-auto-storage',
        title: '10 GB Speicher pro Familie',
        description:
          'Zum Konto gehören ein festes Speicherkontingent, der Familienordner und ein eigener Kalender.'
      },
      {
        id: 'cloud-storage-meter',
        title: 'Speicher direkt in LX sichtbar',
        description:
          'Das Familienarchiv zeigt verwendeten und verfügbaren Speicher verständlich neben den Upload-Knöpfen.'
      },
      {
        id: 'cloud-choice-preserved',
        title: 'Trennen bleibt eine bewusste Entscheidung',
        description:
          'Wer die Cloud in LX ausdrücklich trennt, wird bei einem späteren Neustart nicht ungefragt erneut verbunden.'
      }
    ],
    closing:
      'Die Cloud bleibt familienweise getrennt. Profile benutzen den gemeinsamen Familienbereich über LX, ohne dass Kinder oder verwaltete Profile eigene Nextcloud-Passwörter benötigen.'
  },
  '1.10.0': {
    version: '1.10.0',
    eyebrow: 'Cloud-Dateien und Familienpost direkt in LX',
    title: 'Eure Familien werden digital ein Stück näher',
    intro:
      'Der Familienordner lässt sich jetzt direkt im Planer benutzen. Verbundene Familien können sich außerdem private Briefe senden und einzelne Erwachsene wie Oma oder Opa bewusst in einen Familienchat einladen.',
    highlights: [
      {
        id: 'cloud-file-view',
        title: 'Familienordner in der App',
        description:
          'Fotos und Dokumente lassen sich ansehen, herunterladen, in Ordner sortieren und per Auswahl oder Ziehen-und-Ablegen hochladen.'
      },
      {
        id: 'family-mailbox',
        title: 'Privater Familienbriefkasten',
        description:
          'Bestätigte Familienverbindungen können längere Absprachen wie einen echten Brief senden, beantworten und archivieren.'
      },
      {
        id: 'consented-chat-guests',
        title: 'Oma und Opa sicher im Familienchat',
        description:
          'Ein eingeladenes Erwachsenenprofil stimmt selbst zu und sieht erst danach neue Gruppennachrichten – niemals ältere Chatverläufe.'
      },
      {
        id: 'mobile-reminders-cloud',
        title: 'Handy und Kalender repariert',
        description:
          'Der Problem-melden-Knopf verdeckt mobil keine Bedienfelder mehr und Terminerinnerungen lassen sich wieder zuverlässig speichern.'
      },
      {
        id: 'cloud-domain-helper',
        title: 'Cloud-Domain dauerhaft eingerichtet',
        description:
          'Die öffentliche Nextcloud-Adresse wird automatisch als vertrauenswürdig gespeichert und bleibt auch bei späteren Updates erhalten.'
      }
    ],
    closing:
      'Das Update ergänzt die Datenbank nur um neue Bereiche. Profile, Termine, Aufgaben, Cloud-Dateien, Einstellungen und Zugangsdaten bleiben erhalten.'
  },
  '1.9.3': {
    version: '1.9.3',
    eyebrow: 'Keine erfundenen Cloud-Adressen mehr',
    title: 'Nextcloud öffnet jetzt die wirklich erreichbare Adresse',
    intro:
      'LX hat an die öffentliche Planer-Domain automatisch Port 8080 angehängt. Das war eine falsche Mischung aus Internet- und Heimnetz-Adresse. Die Family Cloud verwendet jetzt ausschließlich eine ausdrücklich konfigurierte, erreichbare Browser-Adresse.',
    highlights: [
      {
        id: 'cloud-real-public-url',
        title: 'Server gibt die Cloud-Adresse vor',
        description:
          'Im Heimnetz wird die echte Server-IP verwendet; eine öffentliche Domain erst nach eingerichteter Proxy-Route.'
      },
      {
        id: 'cloud-no-port-guess',
        title: 'Kein automatisches „:8080“ an Internet-Domains',
        description:
          'Aus familie.example.de entsteht nicht länger eine nicht erreichbare Mischadresse.'
      },
      {
        id: 'cloud-existing-connection',
        title: 'Auch bestehende Verbindung korrigiert',
        description:
          'Die gespeicherte Cloud-Verbindung muss nicht getrennt oder neu angelegt werden.'
      },
      {
        id: 'cloud-proxy-ready',
        title: 'Für spätere HTTPS-Subdomain vorbereitet',
        description:
          'Eine echte Cloud-Domain kann zentral über NEXTCLOUD_PUBLIC_URL aktiviert werden.'
      }
    ],
    closing:
      'Kalender, Sicherungen, Zugangsdaten und alle Familieninhalte bleiben erhalten.'
  },
  '1.9.2': {
    version: '1.9.2',
    eyebrow: 'Die Cloud ist nicht länger versteckt',
    title: 'Family Cloud bekommt ihren eigenen Bereich',
    intro:
      'Nextcloud war bisher tief in der langen Elternzentrale einsortiert. Erwachsene finden die komplette Family Cloud jetzt direkt als eigenen Menüpunkt in der Hauptnavigation.',
    highlights: [
      {
        id: 'cloud-main-navigation',
        title: 'Eigener Menüpunkt „Family Cloud“',
        description:
          'Kalenderabgleich, Sicherungen, Ordner und Zugangsdaten sind ohne langes Scrollen erreichbar.'
      },
      {
        id: 'cloud-adult-only',
        title: 'Weiterhin nur für Erwachsene',
        description:
          'Kinder- und Haustierprofile sehen den Verwaltungsbereich nicht.'
      },
      {
        id: 'cloud-responsive',
        title: 'Auf Browser, Tablet und Handy',
        description:
          'Der neue Bereich passt sich an die vorhandene horizontale Navigation und alle Themes an.'
      },
      {
        id: 'cloud-single-home',
        title: 'Keine doppelte oder versteckte Ansicht',
        description:
          'Die Cloud-Karte wurde aus der langen Elternzentrale entfernt und besitzt jetzt genau einen klaren Platz.'
      }
    ],
    closing:
      'Alle vorhandenen Familien- und Nextcloud-Daten bleiben unverändert.'
  },
  '1.9.1': {
    version: '1.9.1',
    eyebrow: 'Der Familienordner ist jetzt wirklich erreichbar',
    title: 'Cloud-Zugang sicher anzeigen und kopieren',
    intro:
      'Die automatische Family Cloud richtet nicht nur Kalender und Sicherungen ein. Erwachsene können jetzt auch die zugehörigen Nextcloud-Anmeldedaten gezielt öffnen und den Familienordner direkt verwenden.',
    highlights: [
      {
        id: 'cloud-login-access',
        title: 'Zugang nur auf ausdrücklichen Klick',
        description:
          'Benutzername und Passwort erscheinen ausschließlich in der Elternzentrale unter „Verbindung verwalten“.'
      },
      {
        id: 'cloud-copy',
        title: 'Einfach auf Tablet und Handy kopieren',
        description:
          'Beide Werte besitzen einen eigenen Kopieren-Knopf und funktionieren auch im lokalen Heimnetz.'
      },
      {
        id: 'cloud-no-browser-storage',
        title: 'Nicht im Browser gespeichert',
        description:
          'Der Cloud-Zugang wird erst bei Bedarf vom Server geladen und beim Schließen der Ansicht wieder verworfen.'
      },
      {
        id: 'cloud-full-flow-tested',
        title: 'Kompletter Live-Ablauf geprüft',
        description:
          'Konto, Kalender, Ordner, Verbindungstest und Widerruf wurden gegen Nextcloud 34 getestet.'
      }
    ],
    closing:
      'Alle Familieninhalte, Einstellungen und bestehenden Nextcloud-Daten bleiben beim Update erhalten.'
  },
  '1.9.0': {
    version: '1.9.0',
    eyebrow: 'Die Family Cloud richtet sich jetzt selbst ein',
    title: 'Nextcloud funktioniert ohne Passwort-Puzzle',
    intro:
      'Die mitgelieferte Nextcloud kann jetzt direkt aus der Elternzentrale verbunden werden. LX Family erstellt dabei automatisch einen geschützten Cloud-Bereich, einen Familienkalender und den Dateiordner.',
    highlights: [
      {
        id: 'nextcloud-one-click',
        title: 'Ein Klick statt Zugangsdaten kopieren',
        description:
          'Bei der Docker-Cloud genügt die Browser-Adresse. Benutzerkonto und App-Passwort entstehen automatisch.'
      },
      {
        id: 'nextcloud-family-isolation',
        title: 'Jede Familie bleibt getrennt',
        description:
          'Für jede angemeldete Familie wird ein eigener Nextcloud-Benutzer mit eigenem Kalender und Dateibereich angelegt.'
      },
      {
        id: 'nextcloud-calendar-ready',
        title: 'Kalender sofort startklar',
        description:
          'Falls noch kein Kalender existiert, legt LX Family automatisch einen passenden Familienkalender an.'
      },
      {
        id: 'nextcloud-reliable-start',
        title: 'Sicherer Docker-Start',
        description:
          'Das Aktivierungsskript wartet auf die vollständige Einrichtung und ergänzt auf Wunsch die Nextcloud-Kalenderoberfläche.'
      }
    ],
    closing:
      'Das Update verändert keine Familieninhalte. Vorhandene Kalender, Profile, Aufgaben und Einstellungen bleiben erhalten.'
  },
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
