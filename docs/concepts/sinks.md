# Sinks

A sink receives completed wide-event envelopes.

```ts
import * as sinks from "widekit/sinks";
import { axiom } from "widekit/axiom";

const client = createWidekit({
  sinks: [
    sinks.console(),
    axiom({
      token: process.env.AXIOM_TOKEN,
      dataset: process.env.AXIOM_DATASET,
    }),
  ],
});
```

Sink failures fail open by default. Runtime emit failures are reported as diagnostics instead of changing the application lifecycle outcome.
