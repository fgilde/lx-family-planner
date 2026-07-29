# Bei LX Family mitmachen

Dicke Feature-Listen sind schön – entscheidend ist, ob eine Funktion den
Familienalltag wirklich leichter macht. Beiträge dürfen deshalb technisch
ambitioniert sein, sollen sich in der App aber einfach und selbstverständlich
anfühlen.

## Gute Beiträge

- schützen Kinderprofile und private Familiendaten,
- funktionieren auf PC, Smartphone und Tablet,
- berücksichtigen Erwachsene, Kinder, Großeltern und verwaltete Profile,
- erhalten bestehende Daten bei Updates,
- erklären technische Einstellungen in normaler Sprache.

## Lokale Entwicklung

```bash
git clone https://github.com/laxxx-lab/lx-family-planner.git
cd lx-family-planner
npm ci
cp .env.example .env
npm run dev
```

Das Backend läuft separat mit:

```bash
npm run server
```

Vor einem Pull Request:

```bash
npm run check
```

## Pull Requests

1. Für größere Änderungen zuerst ein Issue eröffnen.
2. Einen kleinen, klar abgegrenzten Branch verwenden.
3. Sichtbare Änderungen auf Desktop und Mobil testen.
4. Bei Datenänderungen die Update-Simulation berücksichtigen.
5. Keine echten Familiennamen, Fotos, Nachrichten oder Zugangsdaten in Tests
   und Screenshots verwenden.

Für Fehlermeldungen und Ideen stehen vorbereitete GitHub-Formulare bereit.
