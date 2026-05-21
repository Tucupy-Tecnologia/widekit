# Widekit

Widekit is a TypeScript wide-event observability kit for standardizing production events across our products and sending them to Axiom in one queryable shape.

This package is not primarily designed as a general-purpose public observability framework. It exists to support our production standard across many projects. It is MIT licensed, so use it, fork it, modify it, or ignore our defaults if they do not fit your system.

## What It Does

Widekit creates one lifecycle-scoped Wide Event, lets application code enrich it, then emits the completed event once.

```json
{
  "event.name": "operation.perform",
  "timestamp": "2026-05-20T18:00:00.000Z",
  "outcome": "success",
  "duration.ms": 42,
  "service.name": "example-service",
  "service.version": "2026.05.20.1",
  "deployment.environment.name": "production",
  "user.id": "usr_abc123",
  "domain.amount_cents": 1599
}
```

Fields stay flat and dot-notated so Axiom queries stay predictable across projects.

## Install

```bash
npm install @tucupy/widekit
```

Use the package manager your project already uses.

## Production Setup

For our products, this is the intended setup.

```ts
// src/lib/widekit.ts
import { redactFields, widekit } from "@tucupy/widekit";

export const client = widekit({
  service: {
    name: "example-service",
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  axiom: {
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
  },
  sampling: {
    successRate: 0.05,
    slowDurationMs: 1000,
  },
  redaction: redactFields(["user.email", "auth.token"]),
});
```

Keep this setup explicit in each product. The values are intentionally copy-pasteable instead of hidden behind a library-owned standard config.

This setup sends Wide Events to Axiom through OTLP/HTTP, sets standard service metadata, keeps errors/HTTP 5xx/slow lifecycles, samples normal success events at `5%`, applies explicit redaction, and exports Widekit diagnostics and sampling metadata as OTLP attributes.

## Elysia Usage

Attach the adapter once, then enrich the `wideEvent` inside handlers.

```ts
import { Elysia } from "elysia";
import { widekit } from "@tucupy/widekit/elysia";
import { client } from "./lib/widekit.ts";

const app = new Elysia().use(widekit({ client })).post("/resources", async ({ set, wideEvent }) => {
  set.status = 201;

  wideEvent.set("route.id", "resource.create");
  wideEvent.set("user.id", "usr_abc123");
  wideEvent.set("domain.amount_cents", 1599);

  return { ok: true };
});
```

The adapter sets request and response fields such as:

```ts
"framework.name";
"http.request.method";
"http.response.status_code";
"url.path";
"url.scheme";
```

## TanStack Start Usage

Create one request middleware object and reuse it for both `createStart` and server functions.

```ts
// src/lib/widekit-start.ts
import { widekit, widekitServerFn } from "@tucupy/widekit/tanstack-start";
import { client } from "./widekit.ts";

export const widekitRequest = widekit({ client });
export const withWideEvent = widekitServerFn(widekitRequest);
```

Register the request middleware with TanStack Start.

```ts
// src/start.ts
import { createStart } from "@tanstack/react-start";
import { widekitRequest } from "./lib/widekit-start.ts";

export const start = createStart(() => ({
  requestMiddleware: [widekitRequest],
}));
```

Server functions can use `context.wideEvent` without a cast when they include `withWideEvent`.

```ts
import { createServerFn } from "@tanstack/react-start";
import { withWideEvent } from "./lib/widekit-start.ts";

export const createResource = createServerFn({ method: "POST" })
  .middleware([withWideEvent])
  .handler(async ({ context }) => {
    context.wideEvent.set("route.id", "resource.create");
    context.wideEvent.set("user.id", "usr_abc123");
    context.wideEvent.set("domain.amount_cents", 1599);

    return { ok: true };
  });
```

The adapter sets request fields before downstream code runs and response fields after downstream code returns.

## Manual Lifecycle Usage

Use `client.run` for background work, scripts, queues, or any lifecycle not owned by a framework adapter.

```ts
await client.run("job.process", async (wideEvent) => {
  wideEvent.set("job.name", "job.process");
  wideEvent.set("attempt.number", 1);
  wideEvent.set("user.id", "usr_abc123");
});
```

If the callback throws, Widekit captures the error fields, emits the completed Wide Event, then rethrows.

## Redaction

Redaction is explicit. Widekit does not guess sensitive fields from names.

For the standard setup, configure redaction explicitly:

```ts
import { redactFields, widekit } from "@tucupy/widekit";

widekit({
  service: {
    name: "example-service",
  },
  axiom: {
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
  },
  redaction: redactFields(["user.email", "auth.token"]),
});
```

For lower-level setup or custom hooks, use the redaction helpers directly.

```ts
import { composeRedaction, redactFields } from "@tucupy/widekit";

const redaction = composeRedaction([
  redactFields(["user.email"]),
  redactFields(["auth.token"], { replacement: "[secret]" }),
]);
```

Given this event:

```json
{
  "user.email": "a@example.com",
  "auth.token": "token_123",
  "domain.amount_cents": 1599
}
```

The emitted event contains:

```json
{
  "user.email": "[redacted]",
  "auth.token": "[secret]",
  "domain.amount_cents": 1599
}
```

Order of operations:

1. Serialize field values.
2. Validate a contract if configured.
3. Decide sampling.
4. Apply redaction.
5. Emit to Axiom.

Sampling happens before redaction so sampling rules can inspect the original completed event.

## Sampling

`widekit()` uses `productionSampling()` for the configured sampling policy.

It keeps:

- errors
- HTTP responses with status `>= 500`
- slow lifecycles, default `1000ms`
- normal success events at the configured rate

Our copy-paste production setup uses `successRate: 0.05`, so normal success events are sampled at `5%`. If `sampling` is omitted, Widekit keeps all success events; keep the rate explicit in each product.

```ts
widekit({
  service: {
    name: "example-api",
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  axiom: {
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
  },
  sampling: {
    successRate: 0.05,
    slowDurationMs: 1000,
  },
});
```

With that setup:

- errors are kept
- HTTP 5xx responses are kept
- events slower than `1000ms` are kept
- normal success events are sampled at `5%`

## Standard Fields

Widekit only exports standard fields that Widekit core or adapters can reliably own across all projects.

```ts
import { standardFields } from "@tucupy/widekit";

standardFields.eventName; // "event.name"
standardFields.durationMs; // "duration.ms"
standardFields.httpResponseStatusCode; // "http.response.status_code"
```

Current standard fields:

```txt
event.name
timestamp
outcome
duration.ms

service.name
service.version
deployment.environment.name

request.id
trace.id
span.id

http.request.method
http.response.status_code
url.path
url.scheme
route.id

error.type
error.message
error.stack
```

Product-specific fields such as `user.id`, `org.id`, `product.name`, `job.name`, and `domain.amount_cents` belong in each product's contract or conventions.

## Axiom Queries

Find errors for one service:

```sql
['service.name'] == "example-service" and outcome == "error"
```

Find slow operation events:

```sql
['event.name'] == "operation.perform" and ['duration.ms'] > 1000
```

Find all events for one user when the product sets `user.id`:

```sql
['user.id'] == "usr_abc123"
```

Find HTTP 5xx responses:

```sql
['http.response.status_code'] >= 500
```

## Advanced Primitives

The standard `widekit()` helper is the main path for our products. Lower-level primitives remain available when needed:

- `createWidekit()` for custom lifecycle and sink setup
- `createProductionWidekit()` for the same production setup under the longer factory name
- `@tucupy/widekit/otlp` for direct OTLP Sink usage
- `defineContract()` and `field` for optional product contracts
- custom sampling policies
- custom redaction hooks

Additional framework support should stay modular: add a subpath adapter that exports `widekit({ client })`, keep framework dependencies optional, and preserve the root `widekit({...})` helper as the default explicit production setup.

## License

MIT. Widekit was built for an internal production observability standard, not primarily as a public general-purpose framework. The license permits reuse, modification, redistribution, and publishing under the terms in [LICENSE](./LICENSE).

## Development

```bash
vp install
vp check
vp test
vp pack
```
