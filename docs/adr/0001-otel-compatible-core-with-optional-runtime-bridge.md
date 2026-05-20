# OTel-compatible core with optional runtime bridge

Widekit will use OpenTelemetry-compatible field naming and trace correlation concepts by default, but the core package will not require an OpenTelemetry SDK dependency. Runtime integration with active spans, span enrichment, and OpenTelemetry exporters belongs in an optional adapter so Widekit remains useful as a direct wide-event library while still interoperating cleanly with OpenTelemetry-based systems.
