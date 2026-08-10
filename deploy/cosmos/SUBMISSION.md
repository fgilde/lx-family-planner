# Cosmos package

This directory contains the official-marketplace candidate for **LX Family**.
It uses Cosmos' route and network integration while leaving LX Family's own
profile login active. This is important for the Android app and for the
family-specific permissions inside LX Family.

## Submission checklist

1. Copy `LXFamily/` into
   `azukaar/Cosmos-Servapps-official/servapps/LXFamily/`.
2. Copy the reviewed `icon.png` and the product screenshots into
   `servapps/LXFamily/screenshots/`. The icon URL already uses Cosmos'
   marketplace-local GitHub Pages path.
3. Validate the rendered Cosmos installer on a disposable server before
   submitting the PR. Confirm that the generated `APP_SECRET` remains intact
   after a normal platform update and that both named volumes remain attached.
4. Keep the image tag, description, architecture list and GitHub release
   version in sync. Store templates must never point at `latest`.

The first launch opens LX Family onboarding. It creates the first family only;
additional families require the administrator's explicit registration setting.
