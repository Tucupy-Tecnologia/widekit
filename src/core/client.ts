import { DefaultWideEventContext } from "./context.ts";
import type { ContractDefinition, InferContractFields, WidekitContract } from "./contract.ts";
import type { SamplingPolicy } from "./sampling.ts";
import type { SerializationOptions } from "./serialization.ts";
import type {
  DiagnosticHandler,
  MaybePromise,
  RedactionHook,
  SchemaMode,
  WideEventContext,
  WideEventEnvelope,
  WideEventFields,
  WideEventInput,
  WideEventSink,
} from "./types.ts";

export type ServiceMetadata = {
  name?: string;
  version?: string;
  environment?: string;
};

export type CreateWidekitOptions<Fields extends WideEventFields = WideEventFields> = {
  service?: ServiceMetadata;
  sink?: WideEventSink;
  sinks?: readonly WideEventSink[];
  contract?: WidekitContract;
  schemaMode?: SchemaMode;
  sampling?: SamplingPolicy;
  redaction?: RedactionHook;
  serialization?: SerializationOptions;
  onDiagnostic?: DiagnosticHandler;
  onDrop?: (metadata: WideEventEnvelope["metadata"]) => void;
  _fields?: Fields;
};

export type WidekitClient<Fields extends WideEventFields = WideEventFields> = {
  start(eventName: string): WideEventContext<Fields>;
  run<Result>(
    eventName: string,
    handler: (wideEvent: WideEventContext<Fields>) => MaybePromise<Result>,
  ): Promise<Result>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
};

export function createWidekit<const Definition extends ContractDefinition>(
  options: CreateWidekitOptions<InferContractFields<Definition>> & {
    contract: WidekitContract<Definition>;
  },
): WidekitClient<InferContractFields<Definition>>;
export function createWidekit<Fields extends WideEventFields = Record<string, WideEventInput>>(
  options?: CreateWidekitOptions<Fields>,
): WidekitClient<Fields>;
export function createWidekit<Fields extends WideEventFields = Record<string, WideEventInput>>(
  options: CreateWidekitOptions<Fields> = {},
): WidekitClient<Fields> {
  const sinks = normalizeSinks(options);
  const schemaMode = options.schemaMode ?? (options.contract ? "warn" : "open");

  const client: WidekitClient<Fields> = {
    start(eventName) {
      const context = new DefaultWideEventContext<Fields>(eventName, {
        contract: options.contract,
        schemaMode,
        sinks,
        sampling: options.sampling,
        redaction: options.redaction,
        serialization: options.serialization,
        onDiagnostic: options.onDiagnostic,
        onDrop: options.onDrop,
      });

      if (options.service?.name) {
        context.setBase("service.name", options.service.name);
      }

      if (options.service?.version) {
        context.setBase("service.version", options.service.version);
      }

      if (options.service?.environment) {
        context.setBase("deployment.environment.name", options.service.environment);
      }

      return context;
    },

    async run(eventName, handler) {
      const context = client.start(eventName);

      try {
        const result = await handler(context);
        await context.finish();
        return result;
      } catch (error) {
        context.captureError(error);
        await context.finish();
        throw error;
      }
    },

    async flush() {
      await Promise.all(sinks.map(async (sink) => sink.flush?.()));
    },

    async shutdown() {
      await Promise.all(sinks.map(async (sink) => sink.shutdown?.()));
    },
  };

  return client;
}

function normalizeSinks(options: CreateWidekitOptions): readonly WideEventSink[] {
  if (options.sink && options.sinks) {
    throw new Error("Configure either sink or sinks, not both.");
  }

  if (options.sinks) return options.sinks;
  if (options.sink) return [options.sink];
  return [];
}
