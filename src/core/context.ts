import { diagnostic, reportDiagnostic } from "./diagnostics.ts";
import { decideSampling, type SamplingPolicy } from "./sampling.ts";
import {
  serializeEvent,
  serializeUnknownEvent,
  type SerializationOptions,
} from "./serialization.ts";
import type { WidekitContract } from "./contract.ts";
import { validateContract } from "./contract.ts";
import type {
  DiagnosticHandler,
  Outcome,
  RedactionHook,
  SchemaMode,
  WideEventContext,
  WideEventEnvelope,
  WideEventFields,
  WideEventInput,
  WideEventSink,
  WidekitDiagnostic,
} from "./types.ts";

export type ContextOptions = {
  contract?: WidekitContract;
  schemaMode: SchemaMode;
  sinks: readonly WideEventSink[];
  sampling?: SamplingPolicy;
  redaction?: RedactionHook;
  serialization?: SerializationOptions;
  onDiagnostic?: DiagnosticHandler;
  onDrop?: (metadata: WideEventEnvelope["metadata"]) => void;
};

export class DefaultWideEventContext<
  Fields extends WideEventFields,
> implements WideEventContext<Fields> {
  #fields: Record<string, WideEventInput>;
  #finished = false;
  #finishPromise: Promise<WideEventEnvelope | undefined> | undefined;
  #diagnostics: WidekitDiagnostic[] = [];
  readonly #startedAtMs = performance.now();

  constructor(
    eventName: string,
    private readonly options: ContextOptions,
  ) {
    this.#fields = {
      "event.name": eventName,
      timestamp: new Date(),
      outcome: "unknown",
    };
  }

  get finished() {
    return this.#finished;
  }

  set<K extends string>(
    field: K,
    value: K extends keyof Fields ? Fields[K] : WideEventInput,
  ): WideEventContext<Fields>;
  set(fields: Record<string, WideEventInput>): WideEventContext<Fields>;
  set(
    fieldOrFields: string | Record<string, WideEventInput>,
    value?: unknown,
  ): WideEventContext<Fields> {
    this.#setFields(fieldOrFields, value as WideEventInput);
    return this;
  }

  setBase(
    fieldOrFields: string | Record<string, WideEventInput>,
    value?: WideEventInput,
  ): WideEventContext<Fields> {
    this.#setFields(fieldOrFields, value);
    return this;
  }

  captureError(error: unknown): WideEventContext<Fields> {
    this.#setFields({
      outcome: "error",
      "error.type": getErrorType(error),
      "error.message": getErrorMessage(error),
    });

    if (error instanceof Error && error.stack) {
      this.#setFields("error.stack", error.stack);
    }

    return this;
  }

  async finish(): Promise<WideEventEnvelope | undefined> {
    this.#finishPromise ??= this.#finishOnce();
    return this.#finishPromise;
  }

  #setFields(fieldOrFields: string | Record<string, WideEventInput>, value?: WideEventInput) {
    if (this.#finished) {
      this.#addDiagnostic(
        diagnostic(
          "lifecycle.mutation_after_finish",
          "Ignored wide event mutation after finish.",
          "warn",
        ),
      );
      return;
    }

    if (typeof fieldOrFields === "string") {
      this.#fields[fieldOrFields] = value;
      return;
    }

    for (const [field, fieldValue] of Object.entries(fieldOrFields)) {
      this.#fields[field] = fieldValue;
    }
  }

  async #finishOnce(): Promise<WideEventEnvelope | undefined> {
    this.#finished = true;

    if (this.#fields.outcome === "unknown") {
      this.#fields.outcome = "success" satisfies Outcome;
    }

    this.#fields["duration.ms"] = Math.max(0, performance.now() - this.#startedAtMs);

    const serialized = serializeEvent(this.#fields, this.options.serialization);
    this.#addDiagnostics(serialized.diagnostics);
    this.#addDiagnostics(validateContract(serialized.event, this.options.contract));

    if (this.options.schemaMode === "strict" && hasContractDiagnostics(this.#diagnostics)) {
      this.#addDiagnostic(
        diagnostic(
          "contract.strict_drop",
          "Dropped wide event because strict schema mode found contract diagnostics.",
          "warn",
        ),
      );
      return undefined;
    }

    const sampling = decideSampling(serialized.event, this.options.sampling);
    const metadata = {
      diagnostics: [...this.#diagnostics],
      sampling,
    };

    if (!sampling.kept) {
      this.options.onDrop?.(metadata);
      return undefined;
    }

    const redacted = this.options.redaction
      ? await this.options.redaction(serialized.event)
      : serialized.event;
    const redactedSerialized = serializeUnknownEvent(redacted, this.options.serialization);
    this.#addDiagnostics(redactedSerialized.diagnostics);

    const envelope: WideEventEnvelope = {
      event: redactedSerialized.event,
      metadata: {
        diagnostics: [...this.#diagnostics],
        sampling,
      },
    };

    await this.#emit(envelope);
    return envelope;
  }

  async #emit(envelope: WideEventEnvelope) {
    for (const sink of this.options.sinks) {
      try {
        await sink.emit(envelope);
      } catch (error) {
        this.#addDiagnostic(
          diagnostic("sink.emit_failed", "A sink failed to emit a wide event.", "error", error),
        );
      }
    }
  }

  #addDiagnostics(diagnostics: readonly WidekitDiagnostic[]) {
    for (const item of diagnostics) {
      this.#addDiagnostic(item);
    }
  }

  #addDiagnostic(item: WidekitDiagnostic) {
    this.#diagnostics.push(item);
    reportDiagnostic(this.options.onDiagnostic, item);
  }
}

function getErrorType(error: unknown): string {
  return error instanceof Error ? error.name : "NonErrorThrown";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function hasContractDiagnostics(diagnostics: readonly WidekitDiagnostic[]) {
  return diagnostics.some((item) => item.code.startsWith("contract."));
}
