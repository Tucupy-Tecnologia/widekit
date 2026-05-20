export type MaybePromise<T> = T | Promise<T>;

export type WideEvent = Record<string, unknown>;

export type WideEventInput =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Error
  | readonly WideEventInput[]
  | { readonly [key: string]: WideEventInput };

export type WideEventFields = Record<string, unknown>;

export type Outcome = "success" | "error" | "cancelled" | "unknown";

export type DiagnosticLevel = "debug" | "warn" | "error";

export type WidekitDiagnostic = {
  level: DiagnosticLevel;
  code: string;
  message: string;
  cause?: unknown;
};

export type DiagnosticHandler = (diagnostic: WidekitDiagnostic) => void;

export type SamplingReason = "error" | "slow" | "rate" | "predicate" | "unsampled" | "disabled";

export type SamplingMetadata = {
  kept: boolean;
  reason: SamplingReason;
};

export type WideEventEnvelope = {
  event: WideEvent;
  metadata: {
    diagnostics: WidekitDiagnostic[];
    sampling: SamplingMetadata;
  };
};

export type WideEventSink = {
  emit(envelope: WideEventEnvelope): MaybePromise<void>;
  flush?(): MaybePromise<void>;
  shutdown?(): MaybePromise<void>;
};

export type RedactionHook = (event: WideEvent) => MaybePromise<WideEvent>;

export type SchemaMode = "open" | "warn" | "strict";

export type WideEventContext<Fields extends WideEventFields = WideEventFields> = {
  readonly finished: boolean;
  set<K extends string>(
    field: K,
    value: K extends keyof Fields ? Fields[K] : WideEventInput,
  ): WideEventContext<Fields>;
  set(fields: Record<string, WideEventInput>): WideEventContext<Fields>;
  setBase(field: string, value: WideEventInput): WideEventContext<Fields>;
  setBase(fields: Record<string, WideEventInput>): WideEventContext<Fields>;
  captureError(error: unknown): WideEventContext<Fields>;
  finish(): Promise<WideEventEnvelope | undefined>;
};
