# Awaited core finish with adapter-specific background emission

Widekit core will make `finish()` await sampling, serialization, redaction, and sink emit attempts by default so lifecycle behavior is predictable and tests can assert emitted events deterministically. Framework adapters may use background emission only when the framework provides an after-response lifecycle point or an equivalent hook that does not delay the application response.
