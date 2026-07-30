# Umbrel submission package

Copy the `lx-family-planner` directory into a branch of
`getumbrel/umbrel-apps`, test it on an umbrelOS Linux VM and open an App
Submission pull request.

The initial submission intentionally keeps `gallery: []` and
`releaseNotes: ""`, as requested by the Umbrel submission guide.

Use these existing 1440×900 product views in the submission:

1. `docs/screenshots/demo-dashboard.png`
2. `docs/screenshots/demo-profilauswahl.png`
3. `docs/screenshots/demo-kinderprofil.png`
4. `docs/screenshots/demo-haustierprofil.png`
5. `docs/screenshots/demo-tablet-modus.png`

Before opening the pull request:

1. verify a clean install,
2. restart the app and confirm all data is still present,
3. update the app and confirm `/app/data` and `/app/backups` remain intact,
4. test the dashboard, login, calendar and Android download link.

The package is already pinned to the published `1.13.0` multi-architecture
digest.
