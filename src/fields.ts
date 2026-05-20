import { defineContract, field, type FieldKind } from "./core/contract.ts";

export type StandardFieldCategory =
  | "lifecycle"
  | "service"
  | "deployment"
  | "correlation"
  | "http"
  | "actor"
  | "error"
  | "job";

export type StandardFieldOwner = "widekit" | "adapter" | "application";

export const standardFields = {
  eventName: "event.name",
  timestamp: "timestamp",
  outcome: "outcome",
  durationMs: "duration.ms",

  productName: "product.name",
  serviceName: "service.name",
  serviceVersion: "service.version",
  deploymentEnvironmentName: "deployment.environment.name",
  cloudRegion: "cloud.region",
  gitCommitSha: "git.commit.sha",

  requestId: "request.id",
  traceId: "trace.id",
  spanId: "span.id",

  httpRequestMethod: "http.request.method",
  httpResponseStatusCode: "http.response.status_code",
  urlPath: "url.path",
  urlScheme: "url.scheme",
  routeId: "route.id",

  userId: "user.id",
  orgId: "org.id",
  sessionId: "session.id",
  actorType: "actor.type",

  errorType: "error.type",
  errorMessage: "error.message",
  errorStack: "error.stack",
  errorCode: "error.code",

  jobId: "job.id",
  jobName: "job.name",
  queueName: "queue.name",
  attemptNumber: "attempt.number",
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

  [standardFields.productName]: {
    field: standardFields.productName,
    category: "service",
    owner: "application",
    kind: "string",
    description: "Product family that owns the service, such as traveltogether.",
    example: "traveltogether",
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
  [standardFields.cloudRegion]: {
    field: standardFields.cloudRegion,
    category: "deployment",
    owner: "application",
    kind: "string",
    description: "Cloud or platform region where the lifecycle ran.",
    example: "iad1",
  },
  [standardFields.gitCommitSha]: {
    field: standardFields.gitCommitSha,
    category: "deployment",
    owner: "application",
    kind: "string",
    description: "Git commit SHA for the deployed code.",
    example: "a1b2c3d",
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

  [standardFields.userId]: {
    field: standardFields.userId,
    category: "actor",
    owner: "application",
    kind: "string",
    description: "Authenticated user identifier.",
    example: "user_123",
  },
  [standardFields.orgId]: {
    field: standardFields.orgId,
    category: "actor",
    owner: "application",
    kind: "string",
    description: "Organization, account, tenant, or workspace identifier.",
    example: "org_123",
  },
  [standardFields.sessionId]: {
    field: standardFields.sessionId,
    category: "actor",
    owner: "application",
    kind: "string",
    description: "Authenticated session identifier.",
    example: "sess_123",
  },
  [standardFields.actorType]: {
    field: standardFields.actorType,
    category: "actor",
    owner: "application",
    kind: "string",
    description: "Actor category for the lifecycle.",
    example: "user",
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
  [standardFields.errorCode]: {
    field: standardFields.errorCode,
    category: "error",
    owner: "application",
    kind: "string",
    description: "Domain or platform error code.",
    example: "card_declined",
  },

  [standardFields.jobId]: {
    field: standardFields.jobId,
    category: "job",
    owner: "application",
    kind: "string",
    description: "Background job identifier.",
    example: "job_123",
  },
  [standardFields.jobName]: {
    field: standardFields.jobName,
    category: "job",
    owner: "application",
    kind: "string",
    description: "Stable background job name.",
    example: "invoice.send",
  },
  [standardFields.queueName]: {
    field: standardFields.queueName,
    category: "job",
    owner: "application",
    kind: "string",
    description: "Queue name for background work.",
    example: "email",
  },
  [standardFields.attemptNumber]: {
    field: standardFields.attemptNumber,
    category: "job",
    owner: "application",
    kind: "number",
    description: "Current attempt number for retried work.",
    example: 2,
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

  [standardFields.productName]: field.string({
    description: standardFieldDictionary[standardFields.productName].description,
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
  [standardFields.cloudRegion]: field.string({
    description: standardFieldDictionary[standardFields.cloudRegion].description,
  }),
  [standardFields.gitCommitSha]: field.string({
    description: standardFieldDictionary[standardFields.gitCommitSha].description,
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

  [standardFields.userId]: field.string({
    description: standardFieldDictionary[standardFields.userId].description,
  }),
  [standardFields.orgId]: field.string({
    description: standardFieldDictionary[standardFields.orgId].description,
  }),
  [standardFields.sessionId]: field.string({
    description: standardFieldDictionary[standardFields.sessionId].description,
  }),
  [standardFields.actorType]: field.string({
    description: standardFieldDictionary[standardFields.actorType].description,
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
  [standardFields.errorCode]: field.string({
    description: standardFieldDictionary[standardFields.errorCode].description,
  }),

  [standardFields.jobId]: field.string({
    description: standardFieldDictionary[standardFields.jobId].description,
  }),
  [standardFields.jobName]: field.string({
    description: standardFieldDictionary[standardFields.jobName].description,
  }),
  [standardFields.queueName]: field.string({
    description: standardFieldDictionary[standardFields.queueName].description,
  }),
  [standardFields.attemptNumber]: field.number({
    description: standardFieldDictionary[standardFields.attemptNumber].description,
  }),
});
