import { defineContract, field, type FieldKind } from "./core/contract.ts";

export type StandardFieldCategory =
  | "lifecycle"
  | "service"
  | "deployment"
  | "correlation"
  | "http"
  | "error";

export type StandardFieldOwner = "widekit" | "adapter";

export const standardFields = {
  eventName: "event.name",
  timestamp: "timestamp",
  outcome: "outcome",
  durationMs: "duration.ms",

  serviceName: "service.name",
  serviceVersion: "service.version",
  deploymentEnvironmentName: "deployment.environment.name",

  requestId: "request.id",
  traceId: "trace.id",
  spanId: "span.id",

  httpRequestMethod: "http.request.method",
  httpResponseStatusCode: "http.response.status_code",
  urlPath: "url.path",
  urlScheme: "url.scheme",
  routeId: "route.id",

  errorType: "error.type",
  errorMessage: "error.message",
  errorStack: "error.stack",
} as const;

export type StandardFieldName = (typeof standardFields)[keyof typeof standardFields];

export type StandardFieldDefinition = {
  field: StandardFieldName;
  category: StandardFieldCategory;
  owner: StandardFieldOwner;
  kind: FieldKind;
  description: string;
  example: string | number;
};

export const standardFieldDictionary = {
  [standardFields.eventName]: {
    field: standardFields.eventName,
    category: "lifecycle",
    owner: "widekit",
    kind: "string",
    description: "Stable lifecycle name, such as checkout or clients.create.",
    example: "checkout",
  },
  [standardFields.timestamp]: {
    field: standardFields.timestamp,
    category: "lifecycle",
    owner: "widekit",
    kind: "string",
    description: "ISO timestamp for when the wide event started.",
    example: "2026-05-20T18:00:00.000Z",
  },
  [standardFields.outcome]: {
    field: standardFields.outcome,
    category: "lifecycle",
    owner: "widekit",
    kind: "enum",
    description: "Final lifecycle outcome.",
    example: "success",
  },
  [standardFields.durationMs]: {
    field: standardFields.durationMs,
    category: "lifecycle",
    owner: "widekit",
    kind: "number",
    description: "Lifecycle duration in milliseconds.",
    example: 124,
  },

  [standardFields.serviceName]: {
    field: standardFields.serviceName,
    category: "service",
    owner: "widekit",
    kind: "string",
    description: "Runtime service name.",
    example: "traveltogether-web",
  },
  [standardFields.serviceVersion]: {
    field: standardFields.serviceVersion,
    category: "service",
    owner: "widekit",
    kind: "string",
    description: "Runtime service version or release identifier.",
    example: "2026.05.20.1",
  },
  [standardFields.deploymentEnvironmentName]: {
    field: standardFields.deploymentEnvironmentName,
    category: "deployment",
    owner: "widekit",
    kind: "string",
    description: "Deployment environment name.",
    example: "production",
  },

  [standardFields.requestId]: {
    field: standardFields.requestId,
    category: "correlation",
    owner: "adapter",
    kind: "string",
    description: "Request correlation ID shared across service hops.",
    example: "req_123",
  },
  [standardFields.traceId]: {
    field: standardFields.traceId,
    category: "correlation",
    owner: "adapter",
    kind: "string",
    description: "Distributed trace identifier from trace context.",
    example: "4bf92f3577b34da6a3ce929d0e0e4736",
  },
  [standardFields.spanId]: {
    field: standardFields.spanId,
    category: "correlation",
    owner: "adapter",
    kind: "string",
    description: "Distributed span identifier from trace context.",
    example: "00f067aa0ba902b7",
  },

  [standardFields.httpRequestMethod]: {
    field: standardFields.httpRequestMethod,
    category: "http",
    owner: "adapter",
    kind: "string",
    description: "HTTP request method.",
    example: "POST",
  },
  [standardFields.httpResponseStatusCode]: {
    field: standardFields.httpResponseStatusCode,
    category: "http",
    owner: "adapter",
    kind: "number",
    description: "HTTP response status code.",
    example: 201,
  },
  [standardFields.urlPath]: {
    field: standardFields.urlPath,
    category: "http",
    owner: "adapter",
    kind: "string",
    description: "URL path without scheme, host, or query string.",
    example: "/checkout",
  },
  [standardFields.urlScheme]: {
    field: standardFields.urlScheme,
    category: "http",
    owner: "adapter",
    kind: "string",
    description: "URL scheme.",
    example: "https",
  },
  [standardFields.routeId]: {
    field: standardFields.routeId,
    category: "http",
    owner: "adapter",
    kind: "string",
    description: "Stable framework route identifier.",
    example: "checkout.create",
  },

  [standardFields.errorType]: {
    field: standardFields.errorType,
    category: "error",
    owner: "widekit",
    kind: "string",
    description: "Error class, name, or thrown value category.",
    example: "Error",
  },
  [standardFields.errorMessage]: {
    field: standardFields.errorMessage,
    category: "error",
    owner: "widekit",
    kind: "string",
    description: "Error message safe for the configured destination.",
    example: "payment failed",
  },
  [standardFields.errorStack]: {
    field: standardFields.errorStack,
    category: "error",
    owner: "widekit",
    kind: "string",
    description: "Error stack trace when stack emission is enabled.",
    example: "Error: payment failed",
  },
} as const satisfies Record<StandardFieldName, StandardFieldDefinition>;

export const standardContract = defineContract({
  [standardFields.eventName]: field.string({
    description: standardFieldDictionary[standardFields.eventName].description,
  }),
  [standardFields.timestamp]: field.string({
    description: standardFieldDictionary[standardFields.timestamp].description,
  }),
  [standardFields.outcome]: field.enum(["success", "error", "cancelled", "unknown"], {
    description: standardFieldDictionary[standardFields.outcome].description,
  }),
  [standardFields.durationMs]: field.number({
    description: standardFieldDictionary[standardFields.durationMs].description,
  }),

  [standardFields.serviceName]: field.string({
    description: standardFieldDictionary[standardFields.serviceName].description,
  }),
  [standardFields.serviceVersion]: field.string({
    description: standardFieldDictionary[standardFields.serviceVersion].description,
  }),
  [standardFields.deploymentEnvironmentName]: field.string({
    description: standardFieldDictionary[standardFields.deploymentEnvironmentName].description,
  }),

  [standardFields.requestId]: field.string({
    description: standardFieldDictionary[standardFields.requestId].description,
  }),
  [standardFields.traceId]: field.string({
    description: standardFieldDictionary[standardFields.traceId].description,
  }),
  [standardFields.spanId]: field.string({
    description: standardFieldDictionary[standardFields.spanId].description,
  }),

  [standardFields.httpRequestMethod]: field.string({
    description: standardFieldDictionary[standardFields.httpRequestMethod].description,
  }),
  [standardFields.httpResponseStatusCode]: field.number({
    description: standardFieldDictionary[standardFields.httpResponseStatusCode].description,
  }),
  [standardFields.urlPath]: field.string({
    description: standardFieldDictionary[standardFields.urlPath].description,
  }),
  [standardFields.urlScheme]: field.string({
    description: standardFieldDictionary[standardFields.urlScheme].description,
  }),
  [standardFields.routeId]: field.string({
    description: standardFieldDictionary[standardFields.routeId].description,
  }),

  [standardFields.errorType]: field.string({
    description: standardFieldDictionary[standardFields.errorType].description,
  }),
  [standardFields.errorMessage]: field.string({
    description: standardFieldDictionary[standardFields.errorMessage].description,
  }),
  [standardFields.errorStack]: field.string({
    description: standardFieldDictionary[standardFields.errorStack].description,
  }),
});
