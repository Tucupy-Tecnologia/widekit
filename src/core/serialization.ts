import { diagnostic } from "./diagnostics.ts";
import type { WideEvent, WideEventInput, WidekitDiagnostic } from "./types.ts";

export type SerializationOptions = {
  maxDepth?: number;
  maxArrayLength?: number;
  bigint?: "string" | "number";
  includeErrorStack?: boolean;
};

type SerializationResult = {
  value: unknown;
  diagnostics: WidekitDiagnostic[];
};

const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_ARRAY_LENGTH = 100;

export function serializeEvent(
  event: Record<string, WideEventInput>,
  options: SerializationOptions = {},
): { event: WideEvent; diagnostics: WidekitDiagnostic[] } {
  const diagnostics: WidekitDiagnostic[] = [];
  const serialized: WideEvent = {};

  for (const [field, value] of Object.entries(event)) {
    const result = serializeValue(value, options, new WeakSet(), 0, field);
    diagnostics.push(...result.diagnostics);

    if (result.value !== undefined) {
      serialized[field] = result.value;
    }
  }

  return { event: serialized, diagnostics };
}

export function serializeUnknownEvent(
  event: WideEvent,
  options: SerializationOptions = {},
): { event: WideEvent; diagnostics: WidekitDiagnostic[] } {
  return serializeEvent(event as Record<string, WideEventInput>, options);
}

function serializeValue(
  value: WideEventInput,
  options: SerializationOptions,
  seen: WeakSet<object>,
  depth: number,
  path: string,
): SerializationResult {
  const diagnostics: WidekitDiagnostic[] = [];
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxArrayLength = options.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH;

  if (value === null) return { value: null, diagnostics };

  if (value === undefined) {
    diagnostics.push(
      diagnostic("serialization.undefined_value", `Dropped undefined value at ${path}.`, "debug"),
    );
    return { value: undefined, diagnostics };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { value, diagnostics };
  }

  if (typeof value === "bigint") {
    return {
      value: options.bigint === "number" ? Number(value) : value.toString(),
      diagnostics,
    };
  }

  if (typeof value === "symbol") {
    return { value: String(value), diagnostics };
  }

  if (value instanceof Date) {
    return { value: value.toISOString(), diagnostics };
  }

  if (value instanceof Error) {
    return {
      value: {
        name: value.name,
        message: value.message,
        ...(options.includeErrorStack === false ? {} : { stack: value.stack }),
      },
      diagnostics,
    };
  }

  if (typeof value !== "object") {
    return { value: String(value), diagnostics };
  }

  if (seen.has(value)) {
    diagnostics.push(
      diagnostic(
        "serialization.circular_reference",
        `Replaced circular reference at ${path}.`,
        "warn",
      ),
    );
    return { value: "[Circular]", diagnostics };
  }

  if (depth >= maxDepth) {
    diagnostics.push(
      diagnostic("serialization.max_depth", `Truncated value at ${path} after max depth.`, "warn"),
    );
    return { value: "[MaxDepth]", diagnostics };
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const items = value.slice(0, maxArrayLength).map((item, index) => {
      const result = serializeValue(item, options, seen, depth + 1, `${path}.${index}`);
      diagnostics.push(...result.diagnostics);
      return result.value;
    });

    if (value.length > maxArrayLength) {
      diagnostics.push(
        diagnostic(
          "serialization.max_array_length",
          `Truncated array at ${path} from ${value.length} to ${maxArrayLength} items.`,
          "warn",
        ),
      );
    }

    seen.delete(value);
    return { value: items, diagnostics };
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const result = serializeValue(nestedValue, options, seen, depth + 1, `${path}.${key}`);
    diagnostics.push(...result.diagnostics);

    if (result.value !== undefined) {
      output[key] = result.value;
    }
  }

  seen.delete(value);
  return { value: output, diagnostics };
}
