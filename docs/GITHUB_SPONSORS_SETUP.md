# GitHub Sponsors für LX vorbereiten

Die technische Einbindung ist bereits fertig. Solange das Sponsors-Profil noch
nicht freigeschaltet ist, bleibt der Unterstützen-Bereich in LX automatisch
unsichtbar. Lokal kann er mit `?support-preview=1` geprüft werden.

## Einmalige Einrichtung

1. Auf <https://github.com/sponsors> mit dem Konto `laxxx-lab` die Teilnahme
   starten und die Zwei-Faktor-Anmeldung aktivieren.
2. Auszahlungs- und Steuerangaben ausschließlich direkt bei GitHub hinterlegen.
   Diese Daten und Dokumente gehören niemals ins Repository.
3. Das Profil beschreiben, sowohl einmalige als auch monatliche Stufen anlegen
   und zur Prüfung einreichen.
4. Nach der Freigabe im Repository unter **Settings → General → Features** die
   Funktion **Sponsorships** aktivieren.
5. In `src/constants/project.js` den Wert `GITHUB_SPONSORS_ENABLED` auf `true`
   setzen und die vollständige Release-Prüfung ausführen.

## Vorschlag für das Profil

> LX Family Planner is a private, self-hosted family OS for calendars, chores,
> meals, shopping, rewards, family cloud, and the small things that keep a home
> running. Sponsorships help fund testing, hosting, documentation, and careful
> long-term maintenance. LX stays open, free, and without feature paywalls.

## Einmalige Unterstützung

- **Ein Kaffee · $3 einmalig:** Eine kleine Anerkennung für die nächste ruhige
  Debug-Runde.
- **Release-Helfer · $10 einmalig:** Hilft bei Tests, Dokumentation und
  App-Builds.
- **Family-OS-Rückenwind · $25 einmalig:** Unterstützt besonders den Betrieb
  der Demo und die langfristige Pflege.

## Monatliche Unterstützung

- **Coffee · $3/month:** Ein kleiner Kaffee für die nächste ruhige Debug-Runde.
- **Feature fuel · $7/month:** Unterstützt Tests, Dokumentation und neue Ideen.
- **Family OS supporter · $15/month:** Hilft besonders bei Releases, App-Builds
  und dem Betrieb der öffentlichen Demo.

Alle einmaligen und monatlichen Stufen sind reine freiwillige Unterstützung. Sie
schalten keine Funktionen frei und geben keinen bevorzugten Support. So bleibt
LX für jede Familie gleich.
