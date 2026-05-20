import { diagnostic } from "./diagnostics.ts";
import type { WideEvent, WideEventInput, WidekitDiagnostic } from "./types.ts";

export type FieldKind = "string" | "number" | "boolean" | "enum" | "unknown";

export type FieldDefinition<Value extends WideEventInput = WideEventInput> = {
  kind: FieldKind;
  description?: string;
  values?: readonly Value[];
  validate(value: unknown): value is Value;
};

export type ContractDefinition = Record<string, FieldDefinition>;

export type InferContractFields<Contract extends ContractDefinition> = {
  [Key in keyof Contract]: Contract[Key] extends FieldDefinition<infer Value> ? Value : never;
};

export type WidekitContract<Definition extends ContractDefinition = ContractDefinition> = {
  fields: Definition;
};

type FieldOptions = {
  description?: string;
};

export const field = {
  string(options: FieldOptions = {}): FieldDefinition<string> {
    return {
      kind: "string",
      ...options,
      validate(value): value is string {
        return typeof value === "string";
      },
    };
  },

  number(options: FieldOptions = {}): FieldDefinition<number> {
    return {
      kind: "number",
      ...options,
      validate(value): value is number {
        return typeof value === "number";
      },
    };
  },

  boolean(options: FieldOptions = {}): FieldDefinition<boolean> {
    return {
      kind: "boolean",
      ...options,
      validate(value): value is boolean {
        return typeof value === "boolean";
      },
    };
  },

  enum<const Values extends readonly [WideEventInput, ...WideEventInput[]]>(
    values: Values,
    options: FieldOptions = {},
  ): FieldDefinition<Values[number]> {
    return {
      kind: "enum",
      values,
      ...options,
      validate(value): value is Values[number] {
        return values.includes(value as Values[number]);
      },
    };
  },

  unknown(options: FieldOptions = {}): FieldDefinition<WideEventInput> {
    return {
      kind: "unknown",
      ...options,
      validate(_value): _value is WideEventInput {
        return true;
      },
    };
  },
};

export function defineContract<const Definition extends ContractDefinition>(
  fields: Definition,
): WidekitContract<Definition> {
  return { fields };
}

export function validateContract(
  event: WideEvent,
  contract: WidekitContract | undefined,
): WidekitDiagnostic[] {
  if (!contract) return [];

  const diagnostics: WidekitDiagnostic[] = [];

  for (const [fieldName, value] of Object.entries(event)) {
    const definition = contract.fields[fieldName];

    if (!definition) {
      diagnostics.push(
        diagnostic(
          "contract.unknown_field",
          `Field "${fieldName}" is not declared in the contract.`,
          "warn",
        ),
      );
      continue;
    }

    if (!definition.validate(value)) {
      diagnostics.push(
        diagnostic(
          "contract.invalid_field",
          `Field "${fieldName}" does not match contract type "${definition.kind}".`,
          "warn",
        ),
      );
    }
  }

  return diagnostics;
}
