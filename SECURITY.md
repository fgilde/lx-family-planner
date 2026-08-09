# Security policy

LX Family Planner handles private family information. Please do not disclose a
security vulnerability in a public issue.

## Reporting a vulnerability

Use a private
[GitHub Security Advisory](https://github.com/laxxx-lab/lx-family-planner/security/advisories/new)
where possible. Include the affected version, potential impact, reproducible
steps and any known prerequisites.

Never include real family content, passwords, tokens, Firebase service-account
keys, Nextcloud app passwords or other credentials.

## Supported versions

Security fixes are provided for the current release on `main`. Create a
consistent backup with the bundled backup function before updating.

## Secure operation

- Expose LX publicly only through HTTPS and a deliberately configured reverse
  proxy.
- Set `TRUST_PROXY=1` only behind one trusted reverse proxy. Leave it unset or
  `false` when exposing a Docker port directly.
- Never commit `.env`, `APP_SECRET`, Firebase keys or the data directory.
- Keep the same `APP_SECRET` across updates and restores. It protects stored
  integration secrets and private links.
- Use the guarded update scripts. They back up the database and simulate its
  migration before switching versions.
- Set `DEMO_FAMILY_ID` only for an intentional public showroom. That family is
  kept read-only on the server.
- Keep `PUBLIC_FAMILY_DIRECTORY=false` on internet-facing installations.

German version: [SECURITY.de.md](SECURITY.de.md)
