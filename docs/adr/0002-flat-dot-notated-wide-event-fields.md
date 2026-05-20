# Flat dot-notated wide-event fields

Widekit will emit wide events as flat records with dot-notated field names, such as `service.name`, `http.request.method`, and `user.id`. This matches OpenTelemetry-style naming, keeps Axiom queries straightforward, avoids ambiguous nested merges, and gives contracts, generated docs, and AI agents one canonical field shape to reason about.
