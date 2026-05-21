import { createWidekit, type ServiceMetadata, type WidekitClient } from "./core/client.ts";
import type { WidekitConfig } from "./config.ts";
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

export type StandardWidekitEnv = Record<string, string | undefined> & {
  AXIOM_TOKEN?: string | undefined;
  AXIOM_DATASET?: string | undefined;
  APP_VERSION?: string | undefined;
  NODE_ENV?: string | undefined;
};

export type StandardWidekitService = string | (ServiceMetadata & { name: string });

export type StandardWidekitRedaction =
  | readonly string[]
  | {
      fields: readonly string[];
      replacement?: WideEventInput;
    };

export type StandardWidekitOptions<
  Fields extends WideEventFields = Record<string, WideEventInput>,
> = Omit<CreateProductionWidekitOptions<Fields>, "axiom" | "redaction" | "service"> & {
  config: WidekitConfig;
  service: StandardWidekitService;
  axiom?: Partial<ProductionAxiomOptions>;
  env?: StandardWidekitEnv;
  redact?: StandardWidekitRedaction;
  redaction?: RedactionHook;
};

const DEFAULT_AXIOM_OTLP_ENDPOINT = "https://api.axiom.co";
const DEFAULT_SLOW_DURATION_MS = 1000;

export function widekit<Fields extends WideEventFields = Record<string, WideEventInput>>(
  options: StandardWidekitOptions<Fields>,
): WidekitClient<Fields> {
  const env = options.env ?? standardEnv();

  return createProductionWidekit<Fields>({
    service: standardService(options.service, options.config, env),
    axiom: {
      ...options.axiom,
      endpoint: options.axiom?.endpoint ?? options.config.axiom.endpoint,
      token: options.axiom?.token ?? env[options.config.axiom.tokenEnv],
      dataset: options.axiom?.dataset ?? env[options.config.axiom.datasetEnv],
    },
    sampling: {
      ...options.config.sampling,
      ...options.sampling,
    },
    redaction: standardRedaction(options),
    contract: options.contract,
    schemaMode: options.schemaMode,
    onDiagnostic: options.onDiagnostic,
    onDrop: options.onDrop,
    resource: options.resource,
  });
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

function standardEnv(): StandardWidekitEnv {
  return (
    (globalThis as { process?: { env?: StandardWidekitEnv } }).process?.env ??
    ({} as StandardWidekitEnv)
  );
}

function standardService(
  service: StandardWidekitService,
  config: WidekitConfig,
  env: StandardWidekitEnv,
): ServiceMetadata & {
  name: string;
} {
  if (typeof service === "string") {
    return {
      name: service,
      version: env[config.service.versionEnv],
      environment: env[config.service.environmentEnv],
    };
  }

  return {
    name: service.name,
    version: service.version ?? env[config.service.versionEnv],
    environment: service.environment ?? env[config.service.environmentEnv],
  };
}

function standardRedaction(options: {
  redact?: StandardWidekitRedaction;
  redaction?: RedactionHook;
}): RedactionHook | undefined {
  const hooks: RedactionHook[] = [];

  if (options.redact) {
    if (isRedactionFieldList(options.redact)) {
      hooks.push(redactFields(options.redact));
    } else {
      hooks.push(redactFields(options.redact.fields, { replacement: options.redact.replacement }));
    }
  }

  if (options.redaction) {
    hooks.push(options.redaction);
  }

  if (hooks.length === 0) return undefined;
  if (hooks.length === 1) return hooks[0];

  return composeRedaction(hooks);
}

function isRedactionFieldList(redact: StandardWidekitRedaction): redact is readonly string[] {
  return Array.isArray(redact);
}

function isFailureStatus(status: number): boolean {
  return status >= 500;
}
