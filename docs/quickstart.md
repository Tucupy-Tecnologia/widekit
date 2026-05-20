# Quickstart

Create a Widekit client with one or more sinks.

```ts
import { createWidekit } from "widekit";
import * as sinks from "widekit/sinks";

const client = createWidekit({
  service: {
    name: "checkout-api",
  },
  sink: sinks.console(),
});
```

Wrap a lifecycle with `run`.

```ts
await client.run("checkout", async (wideEvent) => {
  wideEvent.set("user.id", "user_123");
  wideEvent.set("payment.provider", "stripe");
});
```

Use `start` when a framework or adapter owns the lifecycle.

```ts
const wideEvent = client.start("http.request");

try {
  wideEvent.set("http.request.method", "POST");
} catch (error) {
  wideEvent.captureError(error);
  throw error;
} finally {
  await wideEvent.finish();
}
```
