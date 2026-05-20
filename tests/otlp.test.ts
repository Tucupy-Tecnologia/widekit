import { describe, expect, test } from "vite-plus/test";
import { otlp } from "../src/otlp.ts";
import type { WideEventEnvelope } from "../src/index.ts";

function envelope(
  event: WideEventEnvelope["event"],
  metadata: Partial<WideEventEnvelope["metadata"]> = {},
): WideEventEnvelope {
  return {
    event,
    metadata: {
      diagnostics: metadata.diagnostics ?? [],
      sampling: metadata.sampling ?? {
        kept: true,
        reason: "disabled",
      },
    },
  };
}

function firstBody(calls: { init: RequestInit | undefined }[]) {
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
        scope: { name: string; version?: string };
        logRecords: Array<{
          timeUnixNano: string;
          observedTimeUnixNano: string;
          severityNumber: number;
          severityText: string;
          body: Record<string, unknown>;
          attributes: Array<{ key: string; value: Record<string, unknown> }>;
        }>;
      }>;
    }>;
  };
}

describe("OTLP Sink", () => {
  test("requires an endpoint", () => {
    expect(() => otlp({ endpoint: undefined })).toThrow("OTLP endpoint is required.");
  });

  test("posts wide events as OTLP log records", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const sink = otlp({
      endpoint: "https://collector.test/",
      token: "token_123",
      dataset: "wide-events",
      headers: {
        "x-test-header": "test",
      },
      resource: {
        "cloud.region": "local",
      },
      scopeName: "widekit-test",
      scopeVersion: "0.1.0",
      async fetch(url, init) {
        calls.push({
          url: typeof url === "string" ? url : url instanceof URL ? url.href : url.url,
          init,
        });
        return new Response(null, { status: 200 });
      },
    });

    await sink.emit(
      envelope({
        "event.name": "checkout",
        timestamp: "2026-05-20T00:00:00.000Z",
        outcome: "success",
        "service.name": "checkout-service",
        "service.version": "1.2.3",
        "deployment.environment.name": "test",
        "user.id": "user_123",
        "cart.total_cents": 1599,
        "cart.discount_rate": 0.15,
        "feature.enabled": true,
      }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://collector.test/v1/logs");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer token_123",
      "content-type": "application/json",
      "x-axiom-dataset": "wide-events",
      "x-test-header": "test",
    });

    const body = firstBody(calls);
    const resourceAttributes = body.resourceLogs[0]?.resource.attributes;
    expect(resourceAttributes).toContainEqual({
      key: "service.name",
      value: { stringValue: "checkout-service" },
    });
    expect(resourceAttributes).toContainEqual({
      key: "service.version",
      value: { stringValue: "1.2.3" },
    });
    expect(resourceAttributes).toContainEqual({
      key: "deployment.environment.name",
      value: { stringValue: "test" },
    });
    expect(resourceAttributes).toContainEqual({
      key: "cloud.region",
      value: { stringValue: "local" },
    });

    const scopeLog = body.resourceLogs[0]?.scopeLogs[0];
    expect(scopeLog?.scope).toEqual({ name: "widekit-test", version: "0.1.0" });

    const logRecord = scopeLog?.logRecords[0];
    const expectedTimeUnixNano = (
      BigInt(new Date("2026-05-20T00:00:00.000Z").getTime()) * 1_000_000n
    ).toString();
    expect(logRecord?.timeUnixNano).toBe(expectedTimeUnixNano);
    expect(logRecord?.observedTimeUnixNano).toEqual(expect.any(String));
    expect(logRecord?.severityNumber).toBe(9);
    expect(logRecord?.severityText).toBe("INFO");
    expect(logRecord?.body).toEqual({ stringValue: "checkout" });
    expect(logRecord?.attributes).toContainEqual({
      key: "cart.total_cents",
      value: { intValue: "1599" },
    });
    expect(logRecord?.attributes).toContainEqual({
      key: "cart.discount_rate",
      value: { doubleValue: 0.15 },
    });
    expect(logRecord?.attributes).toContainEqual({
      key: "feature.enabled",
      value: { boolValue: true },
    });
  });

  test("marks error outcomes as ERROR severity", async () => {
    const calls: { init: RequestInit | undefined }[] = [];
    const sink = otlp({
      endpoint: "https://collector.test",
      async fetch(_url, init) {
        calls.push({ init });
        return new Response(null, { status: 200 });
      },
    });

    await sink.emit(
      envelope({
        "event.name": "checkout",
        outcome: "error",
        "error.message": "card declined",
      }),
    );

    const logRecord = firstBody(calls).resourceLogs[0]?.scopeLogs[0]?.logRecords[0];
    expect(logRecord?.severityNumber).toBe(17);
    expect(logRecord?.severityText).toBe("ERROR");
  });

  test("can export Widekit metadata when explicitly enabled", async () => {
    const calls: { init: RequestInit | undefined }[] = [];
    const sink = otlp({
      endpoint: "https://collector.test",
      includeWidekitMetadata: true,
      async fetch(_url, init) {
        calls.push({ init });
        return new Response(null, { status: 200 });
      },
    });

    await sink.emit(
      envelope(
        {
          "event.name": "checkout",
          outcome: "success",
        },
        {
          diagnostics: [
            {
              level: "warn",
              code: "serialization.undefined",
              message: "Dropped undefined field.",
            },
          ],
          sampling: {
            kept: true,
            reason: "rate",
          },
        },
      ),
    );

    const logRecord = firstBody(calls).resourceLogs[0]?.scopeLogs[0]?.logRecords[0];
    expect(logRecord?.attributes).toContainEqual({
      key: "widekit.sampling.kept",
      value: { boolValue: true },
    });
    expect(logRecord?.attributes).toContainEqual({
      key: "widekit.sampling.reason",
      value: { stringValue: "rate" },
    });
    expect(logRecord?.attributes).toContainEqual({
      key: "widekit.diagnostics.count",
      value: { intValue: "1" },
    });
  });

  test("throws when the collector rejects a wide event", async () => {
    const sink = otlp({
      endpoint: "https://collector.test",
      async fetch() {
        return new Response(null, { status: 503 });
      },
    });

    await expect(
      sink.emit(
        envelope({
          "event.name": "checkout",
        }),
      ),
    ).rejects.toThrow("OTLP export failed with 503.");
  });
});
