import { describe, expect, test } from "vite-plus/test";
import {
  composeRedaction,
  createProductionWidekit,
  productionSampling,
  redactFields,
  standardFields,
  widekit,
} from "../src/index.ts";
import { decideSampling } from "../src/core/sampling.ts";
import type { WideEvent } from "../src/index.ts";

function otlpBody(calls: { init: RequestInit | undefined }[]) {
  const body = calls[0]?.init?.body;
  if (typeof body !== "string") {
    throw new Error("Expected OTLP request body to be a string.");
  }

  return JSON.parse(body) as {
    resourceLogs: Array<{
      resource: {
        attributes: Array<{ key: string; value: Record<string, unknown> }>;
      };
      scopeLogs: Array<{
        logRecords: Array<{
          attributes: Array<{ key: string; value: Record<string, unknown> }>;
        }>;
      }>;
    }>;
  };
}

function attributesByKey(attributes: Array<{ key: string; value: Record<string, unknown> }>) {
  return Object.fromEntries(attributes.map((attribute) => [attribute.key, attribute.value]));
}

describe("production Widekit", () => {
  test("requires Axiom token and dataset", () => {
    expect(() =>
      createProductionWidekit({
        service: { name: "checkout-api" },
        axiom: { token: undefined, dataset: "wide-events" },
      }),
    ).toThrow("Axiom token is required.");

    expect(() =>
      createProductionWidekit({
        service: { name: "checkout-api" },
        axiom: { token: "token_123", dataset: undefined },
      }),
    ).toThrow("Axiom dataset is required.");
  });

  test("creates the standard production Axiom pipeline", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const client = createProductionWidekit({
      service: {
        name: "checkout-api",
        version: "1.0.0",
        environment: "production",
      },
      axiom: {
        token: "token_123",
        dataset: "wide-events",
        async fetch(url, init) {
          calls.push({
            url: typeof url === "string" ? url : url instanceof URL ? url.href : url.url,
            init,
          });
          return new Response(null, { status: 200 });
        },
      },
      redaction: redactFields(["user.email"]),
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.email", "a@example.com");
      wideEvent.set("cart.total_cents", 1599);
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.axiom.co/v1/logs");
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer token_123",
      "content-type": "application/json",
      "x-axiom-dataset": "wide-events",
    });

    const body = otlpBody(calls);
    const resourceAttributes = attributesByKey(body.resourceLogs[0]?.resource.attributes ?? []);
    expect(resourceAttributes[standardFields.serviceName]).toEqual({
      stringValue: "checkout-api",
    });
    expect(resourceAttributes[standardFields.serviceVersion]).toEqual({
      stringValue: "1.0.0",
    });
    expect(resourceAttributes[standardFields.deploymentEnvironmentName]).toEqual({
      stringValue: "production",
    });

    const recordAttributes = attributesByKey(
      body.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]?.attributes ?? [],
    );
    expect(recordAttributes["event.name"]).toEqual({ stringValue: "checkout" });
    expect(recordAttributes["user.email"]).toEqual({ stringValue: "[redacted]" });
    expect(recordAttributes["cart.total_cents"]).toEqual({ intValue: "1599" });
    expect(recordAttributes["widekit.sampling.reason"]).toEqual({ stringValue: "rate" });
  });

  test("widekit creates an explicit production pipeline", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const client = widekit({
      service: {
        name: "example-service",
        version: "1.2.3",
        environment: "production",
      },
      axiom: {
        token: "token_123",
        dataset: "wide-events",
        async fetch(url, init) {
          calls.push({
            url: typeof url === "string" ? url : url instanceof URL ? url.href : url.url,
            init,
          });
          return new Response(null, { status: 200 });
        },
      },
      sampling: {
        successRate: 0.05,
        slowDurationMs: 1000,
        random: () => 0,
      },
      redaction: redactFields(["user.email"]),
    });

    await client.run("operation.perform", (wideEvent) => {
      wideEvent.set("user.email", "a@example.com");
      wideEvent.set("domain.amount_cents", 1599);
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer token_123",
      "x-axiom-dataset": "wide-events",
    });

    const body = otlpBody(calls);
    const resourceAttributes = attributesByKey(body.resourceLogs[0]?.resource.attributes ?? []);
    expect(resourceAttributes[standardFields.serviceName]).toEqual({
      stringValue: "example-service",
    });
    expect(resourceAttributes[standardFields.serviceVersion]).toEqual({
      stringValue: "1.2.3",
    });
    expect(resourceAttributes[standardFields.deploymentEnvironmentName]).toEqual({
      stringValue: "production",
    });

    const recordAttributes = attributesByKey(
      body.resourceLogs[0]?.scopeLogs[0]?.logRecords[0]?.attributes ?? [],
    );
    expect(recordAttributes["event.name"]).toEqual({ stringValue: "operation.perform" });
    expect(recordAttributes["user.email"]).toEqual({ stringValue: "[redacted]" });
    expect(recordAttributes["domain.amount_cents"]).toEqual({ intValue: "1599" });
    expect(recordAttributes["widekit.sampling.reason"]).toEqual({ stringValue: "rate" });
  });

  test("production sampling keeps errors, HTTP failures, and slow events before rate sampling", () => {
    const sampling = productionSampling({
      successRate: 0,
      slowDurationMs: 1000,
    });

    expect(decideSampling({ outcome: "error" }, sampling)).toEqual({
      kept: true,
      reason: "error",
    });
    expect(
      decideSampling(
        {
          outcome: "success",
          [standardFields.httpResponseStatusCode]: 503,
        },
        sampling,
      ),
    ).toEqual({ kept: true, reason: "predicate" });
    expect(
      decideSampling(
        {
          outcome: "success",
          [standardFields.durationMs]: 1500,
        },
        sampling,
      ),
    ).toEqual({ kept: true, reason: "slow" });
    expect(decideSampling({ outcome: "success" }, sampling)).toEqual({
      kept: false,
      reason: "unsampled",
    });
  });

  test("redaction helpers are explicit and composable", async () => {
    const redaction = composeRedaction([
      redactFields(["user.email"]),
      redactFields(["auth.token"], { replacement: "[secret]" }),
    ]);

    const event = await redaction({
      "event.name": "checkout",
      "user.email": "a@example.com",
      "auth.token": "token_123",
      "cart.total_cents": 1599,
    } satisfies WideEvent);

    expect(event).toEqual({
      "event.name": "checkout",
      "user.email": "[redacted]",
      "auth.token": "[secret]",
      "cart.total_cents": 1599,
    });
  });
});
