import { describe, expect, test } from "vite-plus/test";
import { createWidekit, defineContract, field } from "../src/index.ts";
import * as sinks from "../src/sinks.ts";

describe("createWidekit", () => {
  test("emits one wide event for a successful lifecycle", async () => {
    const sink = sinks.memory();
    const client = createWidekit({
      service: {
        name: "checkout-api",
        version: "1.0.0",
        environment: "test",
      },
      sink,
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_123");
      wideEvent.set({
        "payment.provider": "stripe",
        "cart.total_cents": 1599,
      });
    });

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({
      "event.name": "checkout",
      "service.name": "checkout-api",
      "service.version": "1.0.0",
      "deployment.environment.name": "test",
      "user.id": "user_123",
      "payment.provider": "stripe",
      "cart.total_cents": 1599,
      outcome: "success",
    });
    expect(typeof sink.events[0]?.["duration.ms"]).toBe("number");
  });

  test("captures errors and rethrows from run", async () => {
    const sink = sinks.memory();
    const client = createWidekit({ sink });
    const error = new Error("payment failed");

    await expect(
      client.run("checkout", () => {
        throw error;
      }),
    ).rejects.toThrow("payment failed");

    expect(sink.events[0]).toMatchObject({
      "event.name": "checkout",
      outcome: "error",
      "error.type": "Error",
      "error.message": "payment failed",
    });
  });

  test("sink failures fail open and report diagnostics", async () => {
    const diagnostics: string[] = [];
    const client = createWidekit({
      sink: {
        emit() {
          throw new Error("sink down");
        },
      },
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });

    await expect(
      client.run("checkout", (wideEvent) => {
        wideEvent.set("user.id", "user_123");
      }),
    ).resolves.toBeUndefined();

    expect(diagnostics).toContain("sink.emit_failed");
  });

  test("samples before redaction and sinks receive redacted events", async () => {
    const sink = sinks.memory();
    const client = createWidekit({
      sink,
      sampling: {
        successRate: 0,
        keepWhen(event) {
          return event["user.email"] === "a@example.com";
        },
      },
      redaction(event) {
        return {
          ...event,
          "user.email": "[redacted]",
        };
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.email", "a@example.com");
    });

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]?.["user.email"]).toBe("[redacted]");
    expect(sink.records[0]?.metadata.sampling).toEqual({
      kept: true,
      reason: "predicate",
    });
  });

  test("drops unsampled events before they reach sinks", async () => {
    const sink = sinks.memory();
    let dropped = false;
    const client = createWidekit({
      sink,
      sampling: {
        successRate: 0,
      },
      onDrop() {
        dropped = true;
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_123");
    });

    expect(sink.events).toHaveLength(0);
    expect(dropped).toBe(true);
  });

  test("simple contracts warn by default without blocking emission", async () => {
    const sink = sinks.memory();
    const diagnostics: string[] = [];
    const contract = defineContract({
      "payment.provider": field.enum(["stripe", "adyen"]),
    });
    const client = createWidekit({
      contract,
      sink,
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set({
        "payment.provider": "paypal",
        "unknown.field": "kept",
      });
    });

    expect(sink.events).toHaveLength(1);
    expect(diagnostics).toContain("contract.invalid_field");
    expect(diagnostics).toContain("contract.unknown_field");
  });

  test("strict schema mode drops invalid contract events", async () => {
    const sink = sinks.memory();
    const contract = defineContract({
      "payment.provider": field.enum(["stripe", "adyen"]),
    });
    const client = createWidekit({
      contract,
      schemaMode: "strict",
      sink,
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set({
        "payment.provider": "paypal",
      });
    });

    expect(sink.events).toHaveLength(0);
  });

  test("finish is idempotent and mutations after finish are diagnostics only", async () => {
    const sink = sinks.memory();
    const diagnostics: string[] = [];
    const client = createWidekit({
      sink,
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });
    const wideEvent = client.start("checkout");

    wideEvent.set("user.id", "user_123");
    await wideEvent.finish();
    wideEvent.set("user.id", "user_456");
    await wideEvent.finish();

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]?.["user.id"]).toBe("user_123");
    expect(diagnostics).toContain("lifecycle.mutation_after_finish");
  });
});
