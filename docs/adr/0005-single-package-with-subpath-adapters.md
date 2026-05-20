# Single package with subpath adapters

Widekit v1 will ship as one package with a small production-oriented public surface. The main package export contains the production client helper and core primitives. Framework integrations stay behind explicit subpath exports such as `@tucupy/widekit/elysia` and `@tucupy/widekit/tanstack-start`, while the direct OTLP Sink remains available at `@tucupy/widekit/otlp` for lower-level control.
