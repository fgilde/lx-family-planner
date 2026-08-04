# Changelog

All notable changes to LX Family Planner are documented here.

German version: [CHANGELOG.de.md](CHANGELOG.de.md)

## [1.16.1] — 2026-08-04

### Android sharing and mobile language hotfix

- the Android app now appears as a share target for My Recipe Box `.rtk`
  backups and compatible ZIP streams;
- shared RTK files open the recipe area automatically and import recipes,
  embedded images and source links without a manual file-picker detour;
- incoming archives are copied into protected temporary app storage, limited
  to 120 MB and validated before import;
- the German/English selector now remains fully visible on narrow Android
  screens and shows the active `DE` or `EN` language directly in the header;
- existing families, profiles, recipes, files and settings remain unchanged.

## [1.16.0] — 2026-08-03

### Birthdays, shared chores, recipe maintenance and safe custom themes

- profiles can store an optional birthday; read-only family calendar events and
  reminders are generated automatically;
- initial setup guarantees that at least one signed-in adult can manage the
  family, and repairs affected older households during migration;
- one chore can be offered to several profiles while stars are assigned to the
  person who actually completed it;
- child completions still require approval from the adult who created the
  chore;
- recipes can be created and edited with complete ingredients and preparation
  steps;
- official Tandoor exports, public Facebook Reel drafts and My Recipe Box
  `.rtk` backups can be imported with images where the source provides them;
- the waste-collection dashboard card can be always visible, hidden or shown
  only shortly before the next collection;
- calm motif-free themes and a separate server-validated custom CSS theme are
  available without overwriting built-in designs;
- the complete interface can be switched between English and German before
  login and from the main header;
- the repository now has an English-first presentation, bilingual contribution
  and security documents, and English/German issue forms;
- this release was verified locally before publication and keeps existing
  family data compatible.

## [1.15.0] — 2026-08-03

### Calendar editing, multiple participants and child timetables

- calendar entries can be opened, edited and deleted with their full details;
- a single event can belong to several family members;
- shared events can be updated by the owning family;
- adults can enable and maintain a weekly school timetable for each child;
- one-off cancelled lessons are clearly marked and cleaned up after expiry;
- recipe actions remain usable on narrow phone screens;
- existing families, calendar sources, profiles and settings remain compatible.

For the complete historical record, see [CHANGELOG.de.md](CHANGELOG.de.md).
