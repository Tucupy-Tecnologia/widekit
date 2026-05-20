import type { Outcome, SamplingMetadata, WideEvent } from "./types.ts";

export type SamplingPolicy = {
  successRate?: number;
  keepErrors?: boolean;
  keepSlowOverMs?: number;
  keepWhen?: (event: WideEvent) => boolean;
  random?: () => number;
};

export function decideSampling(
  event: WideEvent,
  policy: SamplingPolicy | undefined,
): SamplingMetadata {
  if (!policy) {
    return { kept: true, reason: "disabled" };
  }

  const outcome = event.outcome as Outcome | undefined;

  if (policy.keepErrors && outcome === "error") {
    return { kept: true, reason: "error" };
  }

  const duration = event["duration.ms"];
  if (
    policy.keepSlowOverMs !== undefined &&
    typeof duration === "number" &&
    duration >= policy.keepSlowOverMs
  ) {
    return { kept: true, reason: "slow" };
  }

  if (policy.keepWhen?.(event)) {
    return { kept: true, reason: "predicate" };
  }

  const successRate = policy.successRate ?? 1;
  if (successRate >= 1) {
    return { kept: true, reason: "rate" };
  }

  if (successRate <= 0) {
    return { kept: false, reason: "unsampled" };
  }

  const random = policy.random ?? Math.random;
  return random() < successRate
    ? { kept: true, reason: "rate" }
    : { kept: false, reason: "unsampled" };
}
