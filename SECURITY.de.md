# Sicherheit

English version: [SECURITY.md](SECURITY.md)

LX Family verwaltet private Familieninformationen. Sicherheitsprobleme bitte
nicht als öffentliches Issue veröffentlichen.

## Eine Schwachstelle melden

Nutze nach Möglichkeit eine private
[GitHub Security Advisory](https://github.com/laxxx-lab/lx-family-planner/security/advisories/new).
Beschreibe knapp:

- betroffene Version,
- mögliche Auswirkung,
- nachvollziehbare Schritte,
- bekannte Voraussetzungen.

Bitte keine echten Familieninhalte, Passwörter, Firebase-Schlüssel,
Nextcloud-App-Passwörter oder andere Zugangsdaten mitsenden.

## Unterstützter Stand

Sicherheitskorrekturen werden für die jeweils aktuelle Version auf `main`
bereitgestellt. Vor einem Update sollte über die mitgelieferte Backup-Funktion
eine konsistente Sicherung erzeugt werden.

## Betrieb

- Öffentlichen Zugriff nur über HTTPS und einen bewusst konfigurierten Reverse
  Proxy erlauben.
- `.env`, `APP_SECRET`, Firebase-Dienstschlüssel und Datenordner niemals in Git
  aufnehmen.
- Updates mit dem mitgelieferten Update-Skript einspielen; es sichert und
  simuliert die Migration vor dem Wechsel.
- Für einen öffentlichen Schauraum `DEMO_FAMILY_ID` setzen. Dieses
  Familienkonto bleibt dann serverseitig schreibgeschützt.
