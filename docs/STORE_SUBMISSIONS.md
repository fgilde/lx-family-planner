# Store-Veröffentlichungen

LX Family Planner is prepared for distribution through GitHub Container
Registry, Unraid Community Applications and the Umbrel App Store.

## Shared release image

All stores use the same signed release source:

```text
ghcr.io/laxxx-lab/lx-family-planner:1.17.0
```

Immutable release digest:

```text
sha256:422d14bc3f85cc13308f05ecd81d5d509568e3f7862e18cbbcb19b70cd21e44b
```

Supported platforms:

- `linux/amd64`
- `linux/arm64`

Persistent paths:

- `/app/data`
- `/app/backups`

The `APP_SECRET` must stay unchanged during updates. Umbrel supplies its
deterministic `APP_SEED`; Unraid asks for a masked random value during setup.

## Unraid

Files:

- `/ca_profile.xml`
- `/templates/lx-family-planner.xml`

Submission:

1. publish the GHCR image and make the package public,
2. open `https://ca.unraid.net/submit`,
3. submit this GitHub repository,
4. run **Validate** and **Scan**,
5. complete the moderator review.

## Umbrel

Files:

- `/deploy/umbrel/lx-family-planner/docker-compose.yml`
- `/deploy/umbrel/lx-family-planner/umbrel-app.yml`
- `/deploy/umbrel/SUBMISSION.md`

The package must be tested on umbrelOS before opening the pull request against
`getumbrel/umbrel-apps`.

## Release safety

Every store test must cover:

1. clean install,
2. family and profile creation,
3. restart with unchanged data,
4. update to a newer image,
5. database and backup persistence,
6. health endpoint,
7. rollback using an LX backup.
