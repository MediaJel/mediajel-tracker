# MediaJel Integrations Assistant — API

The assistant's server side: it writes the frictionless custom tag, checks it mechanically, and
commits it with MediaJel's own credential.

This app is scaffolding around one thing. Everything of substance lives in
`src/features/integrations-assistant/` — a self-contained NestJS feature module written to be
lifted into [`amplication-nestjs-microservices`](../../../amplication-nestjs-microservices)'
`external-service`, at which point `main.ts` and `app.module.ts` here are thrown away.

## What changed, and why it matters

| | The Lambda it replaces | This module |
|---|---|---|
| Integrations knowledge | shipped in the extension's bundle, posted back on every call | **here**, composed server-side |
| Who writes the instructions | the browser | the service |
| The repair round | the browser, as a second call | the service, inside one call |
| Model access | OpenAI, directly | behind `LlmProvider` |
| Deploy validation | ran here already | unchanged — it is the security boundary |

The knowledge moving is the point. A client that ships the conventions can be out of date, can be
read by anyone who unpacks the extension, and cannot be corrected without a release. It also meant
nothing on the server knew anything about integrations, which is precisely what the destination
service needs it to know.

**What did NOT move: the evidence.** `buildPrompt` still runs in the extension, because
PRODUCT.md's third principle is that every byte leaving the browser is previewable first — the
masking and trimming of a recording is exactly the part an operator is entitled to inspect before
pressing Generate. Instructions are not the operator's data; evidence is.

## Endpoints

All five require `Authorization: Bearer <Cognito ID token>` — the same pool the MediaJel dashboard
signs into. A verified token is the whole check; nobody holds a second credential.

| | | |
|---|---|---|
| `GET /api/assistant/health` | `{ ok, model, user, deployConfigured, activityConfigured }` | the session is accepted; whether this service can deploy, and read tag activity |
| `POST /api/assistant/generate` | `{ output, model, violations }` | evidence → a validated tag |
| `GET /api/assistant/tag` | `{ exists, sha, content }` | the file a deploy would replace |
| `POST /api/assistant/deploy` | `{ commitUrl, fileUrl, path, update }` | validate, then commit to `master` |
| `GET /api/assistant/activity?appIds=a,b` | `{ days, tags }` | what each app ID's tag recorded in the last seven days |

`/activity` reads internal-service's `tracker/events/activity` and `page-url-activity` endpoints —
the ones gql-service already reads — for up to five app IDs, and answers for each one on its own:
`ok`, with totals, the latest transaction and sign-up, and the 250 pages that converted most; or
`unavailable`, with internal-service's reason, and never zeros. A page breakdown that fails leaves
the totals standing and sets `partial`. Whole answers are cached per app ID for five minutes.

Pages are reported by shape, not by URL: internal-service lists one row per distinct URL, which on a
WooCommerce checkout is one row per order, carrying a key that opens that order. The service drops
the query string and fragment, replaces identifier segments (all digits, a UUID, 16+ hex
characters) with `:id`, and adds up the rows that share a shape — so
`/checkout/order-received/:id` is one page, and no order key reaches the browser.

Swagger is at `/api/docs`.

## The three seams

They exist so the move into amplication is a provider binding rather than a rewrite. Nothing above
any of the tokens knows — or may know — which implementation is bound.

| Token | Bound here | Bound there |
|---|---|---|
| `LLM_PROVIDER` | `OpenAiProvider` | `LlmOrchestrationService` (`common/llm-orchestration`) — Claude/DeepSeek/Gemini routing |
| `INTEGRATIONS_KNOWLEDGE` | `StaticIntegrationsKnowledge` | `knowledge-base`'s vector search, so the AI Gateway answers integration questions from the same corpus |
| `TAG_ACTIVITY_SOURCE` | `InternalServiceActivitySource` (`fetch`) | an adapter over `MicroservicesService.internal`, the axios instance external-service already points at internal-service |

## Local development

```sh
nvm use                      # Node 22 — see the repo root .nvmrc
bun install
bun run dev                  # :3011, which is what the extension's .env.example points at
```

| Variable | What it is |
|---|---|
| `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | the pool to verify against — the dashboard's |
| `OPENAI_API_KEY` | the model key. Generate returns a named 500 without it |
| `GITHUB_TOKEN` | the deploy credential. Deploy returns a named 500 without it |
| `WIDGET_AI_MODEL` | defaults to `gpt-5.5` |
| `WIDGET_AUTH_REPO` | defaults to `MediaJel/mediajel-frictionless-custom-tag` |
| `INTERNAL_SERVICE_URL`, `INTERNAL_SERVICE_BEARER_TOKEN` | internal-service and its bearer token — the pair gql-service reads. Activity returns a named 503 without them |

Health and the guard work with only the two Cognito values set, which is enough to exercise
Record → Review → Verify in the extension end to end.

Checks: `bun run check` (types, including the tests) · `bun run lint` · `bun run test` ·
`bun run build`.

## Things that will bite

- **Both AI SDKs are ESM-only and this app compiles to CommonJS**, because Nest's DI needs
  `emitDecoratorMetadata`. A plain `await import()` gets downlevelled straight back into
  `require()` by tsc and fails at runtime with `ERR_REQUIRE_ESM`; `openai.provider.ts` goes
  through a `Function`-constructed import that tsc will not rewrite. The build passes either way —
  this only shows up when the process boots.
- **`ApiError` sets `this.message` explicitly.** `HttpException` derives its own message from the
  response object and would otherwise report `"Http Exception"` to every log line and `catch` in
  the service, while the operator-facing text sat unread inside the body.
- **Deploy validates again, on the exact bytes.** Not defensive duplication: this endpoint holds
  the credential, and the browser's opinion does not get to stake the frictionless repo's build.
