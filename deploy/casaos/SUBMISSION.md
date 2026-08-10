# CasaOS package

This directory contains the current CasaOS source package for **LX Family**.
It intentionally installs only LX Family. Nextcloud, Home Assistant, Gotify
and other integrations are connected later from LX Family itself, so a simple
family installation does not receive unused services or credentials.

## Submission checklist

1. Copy `lx-family/docker-compose.yml` to
   `IceWhaleTech/CasaOS-AppStore/Apps/LXFamily/docker-compose.yml`.
2. Copy the complete `lx-family/` folder, including its icon and screenshots.
3. Keep the `version`, image tag, architectures and release notes in sync with
   the published GitHub release. Never use `latest` in a store package.

The container writes its database, private encryption secret and runtime
configuration to `/DATA/AppData/$AppID/data`; database backups live under
`/DATA/AppData/$AppID/backups`. Neither path may be removed during an update.
