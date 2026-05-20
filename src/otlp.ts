import type { WideEvent, WideEventEnvelope, WideEventSink } from "./core/types.ts";

export type OtlpSeverity = {
  number: number;
  text: string;
};

export type OtlpSinkOptions = {
  endpoint: string | undefined;
  token?: string;
  dataset?: string;
  headers?: Record<string, string>;
  resource?: Record<string, unknown>;
  scopeName?: string;
  scopeVersion?: string;
  includeWidekitMetadata?: boolean;
  severity?: (event: WideEvent) => OtlpSeverity;
  fetch?: typeof fetch;
};

type OtlpAnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: string }
  | { doubleValue: number }
  | { arrayValue: { values: OtlpAnyValue[] } }
  | { kvlistValue: { values: OtlpKeyValue[] } };

type OtlpKeyValue = {
  key: string;
  value: OtlpAnyValue;
};

const RESOURCE_ATTRIBUTE_FIELDS = [
  "service.name",
  "service.version",
  "deployment.environment.name",
] as const;

const INFO_SEVERITY: OtlpSeverity = { number: 9, text: "INFO" };
const ERROR_SEVERITY: OtlpSeverity = { number: 17, text: "ERROR" };

export function otlp(options: OtlpSinkOptions): WideEventSink {
  const endpoint = options.endpoint?.trim();
  if (!endpoint) {
    throw new Error("OTLP endpoint is required.");
  }

  const fetchImpl = options.fetch ?? fetch;
  const logsUrl = `${endpoint.replace(/\/+$/, "")}/v1/logs`;

  return {
    async emit(envelope: WideEventEnvelope) {
      const severity = options.severity?.(envelope.event) ?? defaultSeverity(envelope.event);
      const payload = {
        resourceLogs: [
          {
            resource: {
              attributes: toAttributes({
                ...resourceAttributesFromEvent(envelope.event),
                ...options.resource,
              }),
            },
            scopeLogs: [
              {
                scope: {
                  name: options.scopeName ?? "widekit",
                  ...(options.scopeVersion ? { version: options.scopeVersion } : {}),
                },
                logRecords: [
                  {
                    timeUnixNano: timestampToUnixNano(envelope.event.timestamp),
                    observedTimeUnixNano: timestampToUnixNano(new Date()),
                    severityNumber: severity.number,
                    severityText: severity.text,
                    body: toAnyValue(envelope.event["event.name"] ?? "widekit.event"),
                    attributes: toAttributes({
                      ...envelope.event,
                      ...(options.includeWidekitMetadata
                        ? widekitMetadataAttributes(envelope.metadata)
                        : {}),
                    }),
                  },
                ],
              },
            ],
          },
        ],
      };

      const response = await fetchImpl(logsUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
          ...(options.dataset ? { "x-axiom-dataset": options.dataset } : {}),
          ...options.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`OTLP export failed with ${response.status}.`);
      }
    },
  };
}

function defaultSeverity(event: WideEvent): OtlpSeverity {
  if (event.outcome === "error" || event["error.message"] || event["error.type"]) {
    return ERROR_SEVERITY;
  }

  return INFO_SEVERITY;
}

function resourceAttributesFromEvent(event: WideEvent): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  for (const field of RESOURCE_ATTRIBUTE_FIELDS) {
    const value = event[field];
    if (value !== undefined) {
      attributes[field] = value;
    }
  }

  return attributes;
}

function widekitMetadataAttributes(
  metadata: WideEventEnvelope["metadata"],
): Record<string, unknown> {
  return {
    "widekit.sampling.kept": metadata.sampling.kept,
    "widekit.sampling.reason": metadata.sampling.reason,
    "widekit.diagnostics.count": metadata.diagnostics.length,
  };
}

function toAttributes(fields: Record<string, unknown>): OtlpKeyValue[] {
  const attributes: OtlpKeyValue[] = [];

  for (const [key, fieldValue] of Object.entries(fields)) {
    const value = toAnyValue(fieldValue);
    if (value) {
      attributes.push({ key, value });
    }
  }

  return attributes;
}

function toAnyValue(value: unknown): OtlpAnyValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { stringValue: "null" };

  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { boolValue: value };

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { stringValue: String(value) };
    if (Number.isSafeInteger(value)) return { intValue: value.toString() };
    return { doubleValue: value };
  }

  if (typeof value === "bigint") {
    return { intValue: value.toString() };
  }

  if (typeof value === "symbol") {
    return { stringValue: String(value) };
  }

  if (typeof value === "function") {
    return undefined;
  }

  if (value instanceof Date) {
    return { stringValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => toAnyValue(item)).filter(isDefined),
      },
    };
  }

  return {
    kvlistValue: {
      values: toAttributes(value as Record<string, unknown>),
    },
  };
}

function timestampToUnixNano(value: unknown): string {
  const date = value instanceof Date ? value : new Date(value as string | number | Date);
  const time = Number.isFinite(date.getTime()) ? date.getTime() : Date.now();
  return (BigInt(time) * 1_000_000n).toString();
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
