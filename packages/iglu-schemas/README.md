# @mediajel/iglu-schemas

Local **offline-fallback** copies of the `com.mediajel.*` Iglu JSON schemas.

## How schemas resolve

Snowplow Micro resolves `com.mediajel.*` schemas **live over HTTP from the public MediaJel Iglu
registry** — `http://iglu.mediajel.ninja` — the same registry MediaJel's production enrich uses
(see `infra/micro/iglu.json`, which mirrors `charts/snowplow-pipeline-latest` from the infra repo).
No repo clone and no credentials are needed; the registry is public.

The files under `schemas/` are only an **offline fallback** (lowest resolver priority), used when the
public registry is unreachable. They mirror the embedded-registry layout Micro expects
(`schemas/<vendor>/<name>/jsonschema/<version>`, filename = version, no extension) and are mounted at
`/config/iglu-client-embedded/schemas` by `docker-compose.yml`.

## Refreshing the offline fallback

Pulls the canonical schemas over HTTP from the public registry (no git clone):

```bash
bun run schemas:sync
# or point at a different registry:
MJ_IGLU_BASE=http://iglu.mediajel.ninja bun run schemas:sync
```

The training site's validator also performs strict field-level checks itself, so lessons grade
correctly whether an event validates GOOD (schema resolved) or lands in `/micro/bad`.
