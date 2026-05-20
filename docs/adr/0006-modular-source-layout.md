# Modular source layout

Widekit v1 will use a modular source layout with core internals under `src/core/` and production-facing modules such as `src/production.ts`, `src/otlp.ts`, `src/elysia.ts`, and `src/tanstack-start.ts`. This keeps the core framework-independent while making the production happy path visible in the source tree.
