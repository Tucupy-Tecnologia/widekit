# Single package with subpath adapters

Widekit v1 will ship as one package with subpath exports for sinks and framework adapters, such as `widekit/sinks`, `widekit/axiom`, `widekit/elysia`, `widekit/tanstack-start`, and `widekit/bun`. This keeps installation simple while letting optional integrations stay behind explicit imports instead of becoming separate packages.
