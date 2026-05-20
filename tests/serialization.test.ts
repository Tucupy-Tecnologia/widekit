import { describe, expect, test } from "vite-plus/test";
import { createWidekit, type WideEventInput } from "../src/index.ts";
import { memory } from "./helpers.ts";

describe("serialization safety", () => {
  test("serializes dates, errors, symbols, and bigints before emission", async () => {
    const sink = memory();
    const client = createWidekit({
      sink,
      serialization: {
        bigint: "number",
        includeErrorStack: false,
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set({
        "order.created_at": new Date("2026-05-20T00:00:00.000Z"),
        "payment.amount_cents": 1599n,
        "payment.failure": new TypeError("card declined"),
        "debug.symbol": Symbol.for("widekit"),
      });
    });

    expect(sink.events[0]).toMatchObject({
      "order.created_at": "2026-05-20T00:00:00.000Z",
      "payment.amount_cents": 1599,
      "payment.failure": {
        name: "TypeError",
        message: "card declined",
      },
      "debug.symbol": "Symbol(widekit)",
    });
  });

  test("drops undefined fields and reports diagnostics", async () => {
    const sink = memory();
    const diagnostics: string[] = [];
    const client = createWidekit({
      sink,
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("optional.value", undefined);
      wideEvent.set("kept.value", "present");
    });

    expect(Object.hasOwn(sink.events[0] ?? {}, "optional.value")).toBe(false);
    expect(sink.events[0]?.["kept.value"]).toBe("present");
    expect(diagnostics).toContain("serialization.undefined_value");
  });

  test("replaces circular and oversized values with diagnostics", async () => {
    const sink = memory();
    const diagnostics: string[] = [];
    const circular = {} as { self?: unknown };
    circular.self = circular;
    const client = createWidekit({
      sink,
      serialization: {
        maxDepth: 1,
        maxArrayLength: 2,
      },
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("debug.circular", circular as WideEventInput);
      wideEvent.set("debug.nested", { top: { deeper: true } });
      wideEvent.set("debug.items", [1, 2, 3]);
    });

    expect(sink.events[0]?.["debug.circular"]).toEqual({
      self: "[Circular]",
    });
    expect(sink.events[0]?.["debug.nested"]).toEqual({
      top: "[MaxDepth]",
    });
    expect(sink.events[0]?.["debug.items"]).toEqual([1, 2]);
    expect(diagnostics).toContain("serialization.circular_reference");
    expect(diagnostics).toContain("serialization.max_depth");
    expect(diagnostics).toContain("serialization.max_array_length");
  });

  test("serializes Redaction Policy output before sinks receive it", async () => {
    const sink = memory();
    const client = createWidekit({
      sink,
      redaction(event) {
        return {
          ...event,
          "redaction.applied_at": new Date("2026-05-20T00:00:00.000Z"),
          "redaction.dropped": undefined,
        };
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.email", "a@example.com");
    });

    expect(sink.events[0]?.["redaction.applied_at"]).toBe("2026-05-20T00:00:00.000Z");
    expect(Object.hasOwn(sink.events[0] ?? {}, "redaction.dropped")).toBe(false);
  });
});
