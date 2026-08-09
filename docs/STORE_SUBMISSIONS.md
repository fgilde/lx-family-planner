# Store-Veröffentlichungen

LX Family is prepared for distribution through GitHub Container
Registry, Unraid Community Applications and the Umbrel App Store.

## Shared release image

All stores use the same signed release source:

```text
ghcr.io/laxxx-lab/lx-family-planner:<published-release-version>
```

For every store submission, take the matching immutable digest from the
published GitHub release. Do not copy a digest from an older release.

Supported platforms:

- `linux/amd64`
- `linux/arm64`

Persistent paths:

- `/app/data`
- `/app/backups`

The `APP_SECRET` must stay unchanged during updates. Umbrel supplies its
deterministic `APP_SEED`; Unraid asks for a masked random value during setup.
The visible product name is **LX Family · Private Family OS**. Repository,
image and package identifiers deliberately keep `lx-family-planner` so existing
store installs update in place; see [the renaming note](RENAMING.md).

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

For every update, publish the GitHub release first. Then take the exact
multi-architecture GHCR digest for that version, pin it in the Umbrel compose
file as `:<version>@sha256:<digest>`, bump `umbrel-app.yml` and run the Umbrel
update test. Keep `releaseNotes` empty while the Umbrel pull request is a new
app submission. Never pin Umbrel to a guessed digest or the moving `latest`
tag.

## Release safety

Every store test must cover:

1. clean install,
2. family and profile creation,
3. restart with unchanged data,
4. update to a newer image,
5. database and backup persistence,
6. health endpoint,
7. rollback using an LX backup.
