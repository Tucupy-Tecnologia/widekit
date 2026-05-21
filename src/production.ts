import { createWidekit, type ServiceMetadata, type WidekitClient } from "./core/client.ts";
import type { WidekitContract } from "./core/contract.ts";
import type { SamplingPolicy } from "./core/sampling.ts";
import { otlp } from "./otlp.ts";
import type {
  DiagnosticHandler,
  RedactionHook,
  SchemaMode,
  WideEvent,
  WideEventEnvelope,
  WideEventFields,
  WideEventInput,
} from "./core/types.ts";

export type ProductionAxiomOptions = {
  token: string | undefined;
  dataset: string | undefined;
  endpoint?: string | undefined;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
};

export type ProductionSamplingOptions = {
  successRate?: number;
  slowDurationMs?: number;
  keepHttpStatus?: (status: number) => boolean;
  keepWhen?: (event: WideEvent) => boolean;
  random?: () => number;
};

export type CreateProductionWidekitOptions<
  Fields extends WideEventFields = Record<string, WideEventInput>,
> = {
  service: ServiceMetadata & { name: string };
  axiom: ProductionAxiomOptions;
  sampling?: ProductionSamplingOptions;
  redaction?: RedactionHook;
  contract?: WidekitContract;
  schemaMode?: SchemaMode;
  onDiagnostic?: DiagnosticHandler;
  onDrop?: (metadata: WideEventEnvelope["metadata"]) => void;
  resource?: Record<string, unknown>;
  _fields?: Fields;
};

export type RedactFieldsOptions = {
  replacement?: WideEventInput;
};

const DEFAULT_AXIOM_OTLP_ENDPOINT = "https://api.axiom.co";
const DEFAULT_SLOW_DURATION_MS = 1000;

export function widekit<Fields extends WideEventFields = Record<string, WideEventInput>>(
  options: CreateProductionWidekitOptions<Fields>,
): WidekitClient<Fields> {
  return createProductionWidekit(options);
}

export function createProductionWidekit<
  Fields extends WideEventFields = Record<string, WideEventInput>,
>(options: CreateProductionWidekitOptions<Fields>): WidekitClient<Fields> {
  if (!options.axiom.token) {
    throw new Error("Axiom token is required.");
  }

  if (!options.axiom.dataset) {
    throw new Error("Axiom dataset is required.");
  }

  return createWidekit<Fields>({
    service: options.service,
    sink: otlp({
      endpoint: options.axiom.endpoint ?? DEFAULT_AXIOM_OTLP_ENDPOINT,
      token: options.axiom.token,
      dataset: options.axiom.dataset,
      headers: options.axiom.headers,
      fetch: options.axiom.fetch,
      resource: options.resource,
      includeWidekitMetadata: true,
    }),
    sampling: productionSampling(options.sampling),
    redaction: options.redaction,
    contract: options.contract,
    schemaMode: options.schemaMode,
    onDiagnostic: options.onDiagnostic,
    onDrop: options.onDrop,
  });
}

export function productionSampling(options: ProductionSamplingOptions = {}): SamplingPolicy {
  return {
    keepErrors: true,
    keepSlowOverMs: options.slowDurationMs ?? DEFAULT_SLOW_DURATION_MS,
    successRate: options.successRate ?? 1,
    random: options.random,
    keepWhen(event) {
      const status = event["http.response.status_code"];
      if (typeof status === "number" && (options.keepHttpStatus ?? isFailureStatus)(status)) {
        return true;
      }

      return options.keepWhen?.(event) ?? false;
    },
  };
}

export function redactFields(
  fields: readonly string[],
  options: RedactFieldsOptions = {},
): RedactionHook {
  const replacement = options.replacement ?? "[redacted]";

  return (event) => {
    const redacted = { ...event };

    for (const field of fields) {
      if (Object.hasOwn(redacted, field)) {
        redacted[field] = replacement;
      }
    }

    return redacted;
  };
}

export function composeRedaction(hooks: readonly RedactionHook[]): RedactionHook {
  return async (event) => {
    let current: WideEvent = event;

    for (const hook of hooks) {
      current = await hook(current);
    }

    return current;
  };
}

function isFailureStatus(status: number): boolean {
  return status >= 500;
}
