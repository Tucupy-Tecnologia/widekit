<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

# Working with Widekit

Widekit is a wide-event observability kit, not a logger. Prefer the terms **Widekit**, **Wide Event**, **Wide Event Context**, **Sink**, **Adapter**, and **Client** as defined in `CONTEXT.md`.

## Product Rules

- Do not describe Widekit as a logger or logging library.
- Do not add automatic redaction based on field names.
- Redaction is user-configured through a hook.
- Contracts are optional. Contractless usage must remain first-class.
- Keep emitted wide events as flat dot-notated records.
- Keep Widekit metadata out of the event payload unless a sink explicitly exports it.
- Sinks fail open by default; report failures through diagnostics.
- Sampling is core behavior and runs before redaction.
- Framework adapters export a function named `widekit` and accept a configured `client`.

## Preferred API Language

```ts
import { createWidekit } from "widekit";
import * as sinks from "widekit/sinks";

const client = createWidekit({
  sink: sinks.console(),
});

await client.run("checkout", async (wideEvent) => {
  wideEvent.set("user.id", "user_123");
});
```

## Validation

Run `vp check` and `vp test` before considering changes complete.
