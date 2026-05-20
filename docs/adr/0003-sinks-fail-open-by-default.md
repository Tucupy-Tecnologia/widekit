# Sinks fail open by default

Widekit sinks will fail open by default: a failure to emit a completed wide event must not change the application lifecycle outcome. This keeps observability failures from breaking request and job execution, while still allowing explicit fail-closed behavior in tests or strict environments through configuration and diagnostics.
