import type { DiagnosticHandler, WidekitDiagnostic } from "./types.ts";

export function reportDiagnostic(
  handler: DiagnosticHandler | undefined,
  diagnostic: WidekitDiagnostic,
) {
  handler?.(diagnostic);
}

export function diagnostic(
  code: string,
  message: string,
  level: WidekitDiagnostic["level"] = "warn",
  cause?: unknown,
): WidekitDiagnostic {
  return {
    level,
    code,
    message,
    ...(cause === undefined ? {} : { cause }),
  };
}
