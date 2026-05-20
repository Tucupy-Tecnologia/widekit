# Widekit

Widekit is a TypeScript wide-event observability kit. It creates one request or lifecycle-scoped wide event, lets application code enrich it during execution, then emits the completed event to configured sinks.

## Quickstart

```ts
import { createWidekit } from "widekit";
import * as sinks from "widekit/sinks";

const client = createWidekit({
  service: {
    name: "checkout-api",
    environment: "development",
  },
  sink: sinks.console(),
});

await client.run("checkout", async (wideEvent) => {
  wideEvent.set("user.id", "user_123");
  wideEvent.set("payment.provider", "stripe");
});
```

## Simple Contracts

Contracts are optional. Start without one, then add a simple contract when a project wants type validation and field descriptions.

```ts
import { createWidekit, defineContract, field } from "widekit";

const contract = defineContract({
  "payment.provider": field.enum(["stripe", "adyen", "manual"]),
  "cart.total_cents": field.number(),
});

const client = createWidekit({
  contract,
  schemaMode: "warn",
});
```

## Standard Fields

Widekit includes a shared field dictionary for production-wide consistency across products.

```ts
import { standardContract, standardFields } from "widekit";

const client = createWidekit({
  contract: standardContract,
});

await client.run("checkout", async (wideEvent) => {
  wideEvent.set(standardFields.productName, "traveltogether");
  wideEvent.set(standardFields.userId, "user_123");
});
```

## Sinks

```ts
import * as sinks from "widekit/sinks";
import { axiom } from "widekit/axiom";
import { otlp } from "widekit/otlp";

const client = createWidekit({
  sinks: [
    sinks.console(),
    axiom({
      token: process.env.AXIOM_TOKEN,
      dataset: process.env.AXIOM_DATASET,
    }),
    otlp({
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      token: process.env.AXIOM_TOKEN,
      dataset: process.env.AXIOM_DATASET,
    }),
  ],
});
```

Sink emit failures fail open by default and are reported through diagnostics.

## Adapters

Adapters export a function named `widekit` and receive a configured client.

```ts
import { widekit } from "widekit/elysia";

app.use(
  widekit({
    client,
  }),
);
```

```ts
import { widekit } from "widekit/bun";

Bun.serve({
  fetch: widekit({
    client,
    async handler(_request, wideEvent) {
      wideEvent.set("user.id", "user_123");
      return new Response("ok");
    },
  }),
});
```

## Development

```bash
vp install
vp check
vp test
vp pack
```
