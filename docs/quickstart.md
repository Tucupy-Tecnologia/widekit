# Quickstart

Create the production Widekit client once per project.

```ts
import { createProductionWidekit, redactFields } from "@tucupy/widekit";

export const client = createProductionWidekit({
  service: {
    name: "checkout-api",
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

Attach the framework adapter.

```ts
import { widekit } from "@tucupy/widekit/elysia";
import { client } from "./widekit.ts";

app.use(widekit({ client }));
```

Enrich the lifecycle with product-specific context.

```ts
await client.run("checkout", async (wideEvent) => {
  wideEvent.set("user.id", "user_123");
  wideEvent.set("cart.total_cents", 1599);
});
```

Use `createWidekit` directly only when a project needs lower-level control over sinks or lifecycle behavior.
