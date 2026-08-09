# LX Family selbst hosten

LX Family ist ausschließlich Software für den eigenen Server. Es gibt keinen
LX-Betreiber-Account, keine zentrale Familien-Datenbank und keine fest
eingetragene Produktionsdomain. Jede Installation besitzt ihre eigene
SQLite-Datenbank, ihr eigenes `APP_SECRET` und ihre eigene Webadresse.

## Erster Start in LX Family

Nach der Installation beginnt der Assistent in dieser Reihenfolge:

1. Im Browser oben die gewünschte Sprache auswählen. Die Wahl wird nur auf
   diesem Gerät gespeichert.
2. In der Android-App einmal die eigene Heimnetz-IP oder HTTPS-Domain unter
   **Server-Verbindung** eintragen. Der Assistent prüft die Verbindung, bevor
   eine Familie angelegt wird.
3. Die erste Familie, ihr Passwort und die ersten Profile anlegen. Positionen
   wie Mama, Papa, Kind, Oma, Opa oder Haustier bestimmen die passende Ansicht
   und Berechtigung.

Die eigene Domain gehört zur Server-Installation, nicht zum Browser-Assistenten:
Sie wird im Reverse Proxy bzw. Tunnel eingerichtet und anschließend als
`PUBLIC_APP_URL` hinterlegt. Im Browser zeigt der Ersteinrichtungs-Assistent
die aktuell geöffnete Adresse; in der Android-App kann die Server-Adresse dort
direkt geändert werden.

## Im Heimnetz

Nach `docker compose up -d --build` ist LX unter
`http://SERVER-IP:3001` erreichbar. Diese Adresse wird in der Android-App unter
**Server-Verbindung** einmalig eingetragen und nur auf dem jeweiligen Gerät
gespeichert.

Für eine rein lokale Installation sind keine CORS- oder Proxy-Einstellungen
erforderlich:

```env
HOST_PORT=3001
# TRUST_PROXY bleibt leer bzw. false
# CORS_ALLOWED_ORIGINS bleibt leer
```

## Eigene Domain über HTTPS

Ein Reverse Proxy oder Tunnel leitet die eigene Domain auf den Docker-Port von
LX weiter. Danach wird ausschließlich die eigene Adresse konfiguriert:

```env
PUBLIC_APP_URL=https://familie.example.de
TRUST_PROXY=1
```

`PUBLIC_APP_URL` dient nur der Generierung von QR-Codes und APK-Links. Sie
verbindet keine Geräte mit einem fremden Server.

`TRUST_PROXY=1` ist richtig, wenn genau ein vertrauenswürdiger Proxy direkt vor
LX steht, etwa Caddy, Nginx, Traefik oder ein kontrollierter Tunnel. Bei einem
direkt erreichbaren Docker-Port bleibt der Wert leer bzw. `false`.

## CORS – normalerweise nicht nötig

Die Browser-Oberfläche und API werden bei einer normalen Installation von
derselben IP oder Domain ausgeliefert. Das ist Same-Origin und braucht keine
CORS-Ausnahme. Die native Android-App verwendet ausschließlich die eigenen
Capacitor-Ursprünge und die von euch eingetragene Serveradresse.

`CORS_ALLOWED_ORIGINS` ist nur für eine bewusst getrennt gehostete Weboberfläche
gedacht, zum Beispiel wenn ein eigener statischer Frontend-Host auf einen
anderen API-Host zugreift:

```env
CORS_ALLOWED_ORIGINS=https://app.example.de
```

Mehrere ausdrücklich vertrauenswürdige Ursprünge werden kommasepariert
angegeben. Keine URL mit Pfad eintragen und niemals eine fremde oder allgemeine
LX-Domain freigeben.

## Datenhoheit

`data/`, `backups/` und `.env` gehören zur jeweiligen Installation und werden
nicht in das Git-Repository eingecheckt. Für sichere Updates bleibt
`APP_SECRET` unverändert. LX bewahrt die drei neuesten lokalen Datenbank-
Sicherungen samt Manifest auf; ein geschütztes Update hält bis zum erfolgreichen
Prüfschritt zusätzlich eine vierte Rückfall-Sicherung bereit.
