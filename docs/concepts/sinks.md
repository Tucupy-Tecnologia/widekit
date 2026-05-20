# Sinks

A sink receives completed wide-event envelopes.

Most products should use `createProductionWidekit`, which configures the OTLP Sink for Axiom.

```ts
import { createProductionWidekit } from "widekit";

const client = createProductionWidekit({
  service: {
    name: "checkout-api",
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  axiom: {
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
  },
});
```

Use the direct OTLP Sink when a project needs lower-level control.

```ts
import { createWidekit } from "widekit";
import { otlp } from "widekit/otlp";

const client = createWidekit({
  sink: otlp({
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
  }),
});
```

Sink failures fail open by default. Runtime emit failures are reported as diagnostics instead of changing the application lifecycle outcome.

## OTLP

The OTLP Sink sends completed wide events as OTLP/HTTP JSON records to `${endpoint}/v1/logs`.

```ts
import { createWidekit } from "widekit";
import { otlp } from "widekit/otlp";

const client = createWidekit({
  service: {
    name: "checkout-api",
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  sink: otlp({
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    token: process.env.AXIOM_TOKEN,
    dataset: process.env.AXIOM_DATASET,
    resource: {
      "cloud.region": process.env.VERCEL_REGION,
    },
  }),
});
```

Widekit metadata stays in the envelope by default. If a destination should receive sampling and diagnostic metadata as OTLP attributes, opt in explicitly.

```ts
otlp({
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  includeWidekitMetadata: true,
});
```
