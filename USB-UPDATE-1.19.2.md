# LX Family 1.19.2 – Paket für Zuhause

Dieses Archiv enthält den vollständigen Quellstand für Version **1.19.2**,
jedoch bewusst keine privaten Familien-Daten, `.env`-Datei, Android-Schlüssel,
Firebase-Konfiguration oder bereits erzeugte APK.

## Android-APK erstellen (Windows)

1. Das Archiv entpacken und im Projektordner PowerShell öffnen.
2. Die private Firebase-Datei als
   `android/app/google-services.json` ablegen.
3. Die Android-Signatur aus einer früheren Installation in
   `data/android-signing/` übernehmen, falls die APK ein bereits installiertes
   LX Family aktualisieren soll.
4. Abhängigkeiten installieren und die APK bauen:

   ```powershell
   npm ci
   npm run build:apk
   ```

Danach liegen `LX-Family-Planner.apk`, `data/apk/latest.apk` sowie die passende
`version.json` bereit. Die APK nicht durch eine mit einem neuen Schlüssel
signierte Datei ersetzen, wenn vorhandene Installationen aktualisiert werden
sollen.

## Server aktualisieren

Vor dem Austausch immer zuerst in der Elternzentrale eine Datenbanksicherung
erstellen. Beim Entpacken die vorhandenen privaten Ordner `data/` und die
`.env`-Datei der laufenden Installation behalten. Danach die normale
Update-Anleitung aus `README.md` bzw. `docs/INSTALL.de.md` verwenden.
