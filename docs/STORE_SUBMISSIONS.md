# Store-Veröffentlichungen

LX Family Planner is prepared for distribution through GitHub Container
Registry, Unraid Community Applications and the Umbrel App Store.

## Shared release image

All stores use the same signed release source:

```text
ghcr.io/laxxx-lab/lx-family-planner:1.16.1
```

Immutable release digest:

```text
sha256:5673cc73f3967bc963a1ce2f9e9d1cf9ec9b9c25be9f2029b9052afe5cc04901
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
