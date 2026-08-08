# Changelog

All notable changes to LX Family Planner are documented here.

German version: [CHANGELOG.de.md](CHANGELOG.de.md)

## [Unreleased]

## [1.18.0] — 2026-08-08

### Languages and bug fixes

- five new interface languages: French, Spanish, Italian, Dutch and Polish;
  missing translations fall back to English cleanly;
- "Today at a glance" and the calendar badge count only the current day's
  events instead of every upcoming event (#15);
- "My events" starts at the current day (#11);
- assigned events show the profile names instead of always "family event"
  (#15);
- the tab bar no longer shifts when switching, and the last tab stays
  reachable in Firefox (#3);
- the hardware back button and gesture navigates back inside the app on
  Android instead of exiting (#15);
- the dashboard studio no longer clips its footer when the conditional
  picker blocks are shown (#15);
- the "create family" onboarding dialog shows why "Next" is inactive
  (password too short or invite code required).

## [1.16.2] — 2026-08-04

### Notifications, wall display and finer profile permissions

- ntfy is available as an additional, optional push channel alongside Gotify;
- a dedicated, read-only wall display profile exposes only reading and the two
  intended check-off actions, so a shared tablet cannot change settings or
  switch profiles;
- the tablet view asks "who completed this?" with large profile bubbles instead
  of navigating away, so checking off a chore stays fast at a central display;
- chores can be marked as shared, so a single completion counts for everyone
  that day while the stars go to the person who actually did it;
- adult "Tochter (erwachsen)" and "Sohn (erwachsen)" positions receive
  family-admin rights, and cloud or mailbox access can be granted per profile
  independently of the role;
- switching from an adult to a child profile now immediately closes the cloud
  and parent areas and returns to the dashboard;
- individual modules such as the mailbox or cloud can be hidden globally for the
  whole family or per profile.

### Calendar, Home Assistant and cloud uploads

- the waste-collection card can be set to always, never, or only a configurable
  number of days before the next pickup;
- the Home Assistant entity list scrolls within a capped height instead of
  collapsing many devices into thin lines, and selecting a device expands the
  "allow control" detail panel;
- failed cloud uploads now surface the concrete HTTP status code instead of
  failing silently.

### Voluntary project support

- the repository is prepared for the official GitHub Sponsors button;
- a quiet, bilingual support card for one-time or monthly sponsorship is ready
  for the public sign-in page and the adult family settings, but remains hidden
  until the Sponsors profile has actually been approved;
- child profiles, pet profiles, dashboards, and profile selection never show a
  sponsorship prompt;
- sponsorship stays optional and does not unlock features, remove limits, or
  create a paid support lane.

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
