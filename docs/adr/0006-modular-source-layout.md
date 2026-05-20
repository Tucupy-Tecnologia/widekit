# Modular source layout

Widekit v1 will use a modular source layout with core internals under `src/core/` and public subpath modules such as `src/sinks.ts`, `src/axiom.ts`, `src/elysia.ts`, `src/tanstack-start.ts`, and `src/bun.ts`. This keeps the core framework-independent while making package subpath exports map directly to visible source files.
