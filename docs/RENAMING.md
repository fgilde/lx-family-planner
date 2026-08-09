# From LX Family Planner to LX Family

The public product name is now **LX Family** with the subtitle **Private
Family OS**. The shorter name describes the project better: LX Family is more
than a calendar or a planning tool. It is a private, self-hosted home space for
the whole family.

## What changes

- The web app, PWA, Android app label, documentation, Unraid template and
  Umbrel listing use **LX Family**.
- Public descriptions use the subtitle **Private Family OS**.
- Future announcements and screenshots should use the new name.

## What deliberately stays the same

The technical identifiers stay in place to make an existing installation a
normal update rather than a migration:

- GitHub repository: `laxxx-lab/lx-family-planner`
- Docker image: `ghcr.io/laxxx-lab/lx-family-planner`
- Compose/service paths and persistent folders
- Android application id: `com.lxfamily.planner`

There is no data move and no need to reinstall the Android app. A later LX
Family APK updates the existing application in place. The old name can remain
in historical release notes and technical paths without changing the product
name users see.

## Still self-hosted

LX Family is software, not a hosted LX service. Every household brings its own
server, IP address or domain, database, `APP_SECRET` and backups. The project
does not operate accounts or store family data for other installations. See
[self-hosting](SELF_HOSTING.md) for LAN, own-domain, Android and CORS setup.
