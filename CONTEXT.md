# Widekit

Widekit is a TypeScript observability library for building and emitting wide events across web requests, background jobs, and framework integrations.

## Language

**Widekit**:
The TypeScript library that provides typed wide-event contracts, event lifecycle management, sinks, and framework adapters.
_Avoid_: logger, logging library, wide-events package

**Package Name**:
The npm import name for Widekit, `widekit`.
_Avoid_: @tucupy/widekit, @your-org/widekit, @your-org/wide-events

**Wide Event**:
A lifecycle-scoped observability record enriched during execution and emitted once when the lifecycle completes.
_Avoid_: log line, span, trace, metric

**Wide Event Context**:
The mutable in-flight object used to enrich a lifecycle before Widekit emits the final wide event.
_Avoid_: event, logger, span

**Contract**:
An optional typed description of known wide-event fields and their policy metadata.
_Avoid_: required schema, database schema

**Simple Contract**:
A v1 contract that validates field value types and optionally describes fields.
_Avoid_: governance contract, policy engine

**Schema Mode**:
The policy that decides how Widekit handles fields that are not described by a contract.
_Avoid_: validation mode, strictness

**Redaction Policy**:
A user-defined rule set that transforms or removes selected wide-event data before emission.
_Avoid_: redaction preset, automatic PII detection, smart redaction

**Serialization Safety**:
Widekit's mechanical conversion of in-flight field values into deterministic event data without applying privacy policy.
_Avoid_: redaction, sanitization, PII filtering

**OpenTelemetry Compatibility**:
Widekit's default alignment with OpenTelemetry naming, trace context, and interoperability expectations.
_Avoid_: OpenTEL, OTel-only mode

**Base Field**:
A Widekit-owned lifecycle, service, runtime, framework, HTTP, timing, outcome, or correlation field.
_Avoid_: reserved field, system field

**Application Field**:
A field set by application code to describe business, product, user, or domain-specific context.
_Avoid_: custom field, user field

**Sink**:
A destination that receives completed wide events from Widekit.
_Avoid_: exporter, transport, appender

**Lifecycle Run**:
A Widekit-managed execution block that automatically finishes its wide event context.
_Avoid_: transaction, operation wrapper

**Sampling Policy**:
A lifecycle-completion rule set that decides whether a wide event is emitted to sinks.
_Avoid_: backend sampling, upfront random drop

**Wide Event Envelope**:
The internal delivery wrapper that carries a wide event plus Widekit metadata for sinks.
_Avoid_: event payload, metadata fields

**Adapter**:
A framework-specific integration that attaches Widekit to that framework's lifecycle.
_Avoid_: plugin when speaking generically, logger middleware

**Client**:
A configured Widekit instance passed into adapters and application code.
_Avoid_: logger, sdk

**Context Property**:
The framework-visible `wideEvent` property that exposes the active wide event context to application code.
_Avoid_: logger, event, observability

**Outcome**:
The final lifecycle result recorded on a wide event.
_Avoid_: status, result when referring to lifecycle health

**Diagnostic**:
A Widekit-internal notice about configuration, lifecycle, serialization, sampling, contract, or sink behavior.
_Avoid_: event field, log line

## Relationships

- **Widekit** creates, enriches, samples, redacts, and emits **Wide Events**.
- **Package Name** identifies Widekit in npm installs and TypeScript imports.
- A **Wide Event** represents one completed lifecycle such as an HTTP request or background job.
- A **Wide Event Context** produces exactly one **Wide Event** when it finishes.
- A **Contract** can describe fields used by **Wide Event Contexts**, but **Widekit** can operate without one.
- A **Simple Contract** is the v1 form of **Contract** and does not enforce privacy or cardinality policy.
- **Schema Mode** controls whether unknown fields are accepted, warned about, or rejected.
- A **Redaction Policy** is configured by the application owner; Widekit does not infer it from field names or presets.
- **Serialization Safety** is always applied before emission and is distinct from **Redaction Policy**.
- **OpenTelemetry Compatibility** influences default field names and correlation behavior without requiring OpenTelemetry as the primary sink.
- **Base Fields** are normally set by Widekit and adapters; **Application Fields** are normally set by application code.
- A **Sink** receives completed **Wide Events** after lifecycle completion.
- A **Lifecycle Run** owns a **Wide Event Context** and finishes it automatically.
- A **Sampling Policy** evaluates the completed **Wide Event** before sinks receive it.
- A **Wide Event Envelope** lets sinks inspect Widekit metadata without polluting the **Wide Event**.
- An **Adapter** receives a **Client** and connects it to a framework lifecycle.
- A **Context Property** gives application code access to the active **Wide Event Context**.
- An **Outcome** is determined by lifecycle completion, captured errors, or adapter status handling.
- A **Diagnostic** reports Widekit behavior without changing the **Wide Event** by default.

## Example dialogue

> **Dev:** "Should this route write a normal log when checkout fails?"
> **Domain expert:** "No — enrich the request's **Wide Event Context** and let **Widekit** emit the **Wide Event** when the request finishes."
>
> **Dev:** "Do we need a **Contract** before trying Widekit?"
> **Domain expert:** "No — start without one, then add a **Contract** when the project needs field governance."
>
> **Dev:** "Does a v1 **Simple Contract** enforce PII or cardinality rules?"
> **Domain expert:** "No — it validates value types and can describe fields."
>
> **Dev:** "Will Widekit automatically block fields named token or password?"
> **Domain expert:** "No — define a **Redaction Policy** for the data this application must transform or remove."
>
> **Dev:** "Does **Serialization Safety** mean Widekit is redacting sensitive data?"
> **Domain expert:** "No — it only makes values emit reliably; privacy rules belong in the **Redaction Policy**."
>
> **Dev:** "Should route code set the response status as an **Application Field**?"
> **Domain expert:** "No — response status is a **Base Field** and should normally be set by the framework adapter."
>
> **Dev:** "Is Axiom an exporter?"
> **Domain expert:** "In Widekit language, Axiom is a **Sink**."
>
> **Dev:** "Can we sample before running the handler?"
> **Domain expert:** "No — Widekit's **Sampling Policy** evaluates the completed **Wide Event**."
>
> **Dev:** "Should sampling reason appear as a normal event field?"
> **Domain expert:** "No — keep it in the **Wide Event Envelope** unless a sink explicitly chooses to export it."
>
> **Dev:** "What does `widekit({ client })` do in an Elysia app?"
> **Domain expert:** "That is the Elysia **Adapter** receiving the configured **Client**."
>
> **Dev:** "Should route code receive a logger?"
> **Domain expert:** "No — adapters expose the active **Wide Event Context** through the `wideEvent` **Context Property**."
>
> **Dev:** "Should we call `wideEvent.log()` for each payment retry?"
> **Domain expert:** "No — enrich the **Wide Event Context** and emit one **Wide Event** with the final **Outcome**."
>
> **Dev:** "Where do sink failures go if sinks fail open?"
> **Domain expert:** "They are reported as **Diagnostics**, not as application errors."

## Flagged ambiguities

- "widekit" is the product/package name; "wide event" is the observability concept.
- `widekit` is the canonical package name for import examples.
- "wide event" is the emitted record; "wide event context" is the mutable object used before emission.
- "contract" is optional field governance, not a prerequisite for using Widekit.
- "redaction" means user-configured policy, not built-in name guessing or presets.
- "OpenTelemetry" is the canonical term; "OpenTEL" should not appear in docs or API names.
- Widekit is not a per-step lifecycle logger in v1; it enriches one **Wide Event** per lifecycle.
