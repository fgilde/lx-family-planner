# LX Family 1.18.5 Preview

This repository is the isolated test build for the next LX Family release.

## Scope

- iOS PWA installation flow for Safari: **Share → Add to Home Screen**
- iOS safe-area and standalone display support
- all 1.18.4 stable functionality

## Deployment

Deploy this `main` branch to a test environment only. It reports version `1.18.5` so the preview is clearly distinguishable from the current stable release.

Do not use the automatic stable-update service for this preview. The preview includes a local Docker override so it never tries to pull an unpublished stable image:

```bash
cp .env.example .env
docker compose -f compose.production.yaml -f compose.preview.yaml up -d --build
```

Verify `/api/health` returns `"version":"1.18.5"`. Existing test data stays in the usual `data/` and `backups/` folders.
