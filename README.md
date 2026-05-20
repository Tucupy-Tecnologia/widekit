# Widekit

Widekit is a TypeScript wide-event observability kit for standardizing production events across our products and sending them to Axiom in one queryable shape.

This package is not primarily designed as a general-purpose public observability framework. It exists to support our production standard across many projects. It is MIT licensed, so use it, fork it, modify it, or ignore our defaults if they do not fit your system.

## What It Does

Widekit creates one lifecycle-scoped Wide Event, lets application code enrich it, then emits the completed event once.

```json
{
  "event.name": "checkout",
  "timestamp": "2026-05-20T18:00:00.000Z",
  "outcome": "success",
  "duration.ms": 42,
  "service.name": "traveltogether-web",
  "service.version": "2026.05.20.1",
  "deployment.environment.name": "production",
  "user.id": "user_123",
  "cart.total_cents": 1599
}
```

Fields stay flat and dot-notated so Axiom queries stay predictable across projects.

## Install

```bash
npm install widekit
```

Use the package manager your project already uses.

## Production Setup

For our products, this is the intended setup.

```ts
// src/lib/widekit.ts
import { createProductionWidekit, redactFields } from "widekit";

export const client = createProductionWidekit({
  service: {
    name: "traveltogether-web",
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  axiom: {
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
  },
  redaction: redactFields(["user.email", "auth.token"]),
});
```

`createProductionWidekit` configures:

- Axiom export through OTLP/HTTP
- standard service, version, and environment fields
- production sampling defaults
- explicit redaction
- Widekit diagnostics and sampling metadata as OTLP attributes

## Elysia Usage

Attach the adapter once, then enrich the `wideEvent` inside handlers.

```ts
import { Elysia } from "elysia";
import { widekit } from "widekit/elysia";
import { client } from "./lib/widekit.ts";

const app = new Elysia().use(widekit({ client })).post("/checkout", async ({ set, wideEvent }) => {
  set.status = 201;

  wideEvent.set("route.id", "checkout.create");
  wideEvent.set("user.id", "user_123");
  wideEvent.set("cart.total_cents", 1599);

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

Register the request middleware with TanStack Start.

```ts
// src/start.ts
import { createStart } from "@tanstack/react-start";
import { widekit } from "widekit/tanstack-start";
import { client } from "./lib/widekit.ts";

export const start = createStart(() => ({
  requestMiddleware: [widekit({ client })],
}));
```

Downstream server middleware or handlers can use the `wideEvent` from request context.

```ts
import { createMiddleware } from "@tanstack/react-start";
import type { TanStackStartWidekitContext } from "widekit/tanstack-start";

export const checkoutWideEvent = createMiddleware().server(async ({ context, next }) => {
  const { wideEvent } = context as TanStackStartWidekitContext;

  wideEvent.set("route.id", "checkout.create");
  wideEvent.set("user.id", "user_123");
  wideEvent.set("cart.total_cents", 1599);

  return next();
});
```

The adapter sets request fields before downstream code runs and response fields after downstream code returns.

## Manual Lifecycle Usage

Use `client.run` for background work, scripts, queues, or any lifecycle not owned by a framework adapter.

```ts
await client.run("invoice.send", async (wideEvent) => {
  wideEvent.set("job.name", "invoice.send");
  wideEvent.set("attempt.number", 1);
  wideEvent.set("user.id", "user_123");
});
```

If the callback throws, Widekit captures the error fields, emits the completed Wide Event, then rethrows.

## Redaction

Redaction is explicit. Widekit does not guess sensitive fields from names.

```ts
import { composeRedaction, redactFields } from "widekit";

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
  "cart.total_cents": 1599
}
```

The emitted event contains:

```json
{
  "user.email": "[redacted]",
  "auth.token": "[secret]",
  "cart.total_cents": 1599
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

`createProductionWidekit` installs `productionSampling()` by default.

It keeps:

- errors
- HTTP responses with status `>= 500`
- slow lifecycles, default `1000ms`
- normal success events at the configured rate

The default `successRate` is `1`, so production events are not silently dropped unless a project opts into sampling.

```ts
createProductionWidekit({
  service: {
    name: "checkout-api",
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  axiom: {
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
  },
  sampling: {
    successRate: 0.2,
    slowDurationMs: 750,
  },
});
```

With that config:

- errors are kept
- HTTP 5xx responses are kept
- events slower than `750ms` are kept
- normal success events are sampled at `20%`

## Standard Fields

Widekit only exports standard fields that Widekit core or adapters can reliably own across all projects.

```ts
import { standardFields } from "widekit";

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

Product-specific fields such as `user.id`, `org.id`, `product.name`, `job.name`, and `cart.total_cents` belong in each product's contract or conventions.

## Axiom Queries

Find errors for one service:

```sql
['service.name'] == "traveltogether-web" and outcome == "error"
```

Find slow checkout events:

```sql
['event.name'] == "checkout" and ['duration.ms'] > 1000
```

Find all events for one user when the product sets `user.id`:

```sql
['user.id'] == "user_123"
```

Find HTTP 5xx responses:

```sql
['http.response.status_code'] >= 500
```

## Advanced Primitives

The production helper is the main path for our products. Lower-level primitives remain available when needed:

- `createWidekit()` for custom lifecycle and sink setup
- `widekit/otlp` for direct OTLP Sink usage
- `widekit/axiom` for direct Axiom ingest usage
- `widekit/sinks` for memory and console sinks
- `defineContract()` and `field` for optional product contracts
- custom sampling policies
- custom redaction hooks

## Publishing

Before publishing, verify the package contents and checks:

```bash
vp install
vp check
vp test
vp run build
npm pack --dry-run
```

Publish to npm:

```bash
npm login
npm publish --access public
```

For future releases, bump the version first:

```bash
npm version patch
npm publish --access public
```

The `widekit` package name was not found on the public npm registry during the initial publish prep, so it appears available. npm still has the final say at publish time.

## License

MIT. Widekit was built for Tucupy's production observability standard, not primarily as a public general-purpose framework. The license permits reuse, modification, redistribution, and publishing under the terms in [LICENSE](./LICENSE).

## Development

```bash
vp install
vp check
vp test
vp pack
```
