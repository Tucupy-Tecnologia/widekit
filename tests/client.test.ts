import { describe, expect, test } from "vite-plus/test";
import { createWidekit, type WideEventEnvelope } from "../src/index.ts";
import * as sinks from "../src/sinks.ts";

describe("Widekit Client sink management", () => {
  test("emits to every configured Sink and forwards lifecycle calls", async () => {
    const firstRecords: WideEventEnvelope[] = [];
    const secondRecords: WideEventEnvelope[] = [];
    let flushes = 0;
    let shutdowns = 0;
    const client = createWidekit({
      sinks: [
        {
          emit(envelope) {
            firstRecords.push(envelope);
          },
          flush() {
            flushes += 1;
          },
          shutdown() {
            shutdowns += 1;
          },
        },
        {
          emit(envelope) {
            secondRecords.push(envelope);
          },
          flush() {
            flushes += 1;
          },
          shutdown() {
            shutdowns += 1;
          },
        },
      ],
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_123");
    });
    await client.flush();
    await client.shutdown();

    expect(firstRecords).toHaveLength(1);
    expect(secondRecords).toHaveLength(1);
    expect(firstRecords[0]?.event).toMatchObject({
      "event.name": "checkout",
      "user.id": "user_123",
    });
    expect(secondRecords[0]?.event).toMatchObject({
      "event.name": "checkout",
      "user.id": "user_123",
    });
    expect(flushes).toBe(2);
    expect(shutdowns).toBe(2);
  });

  test("continues emitting to other Sinks after one Sink fails", async () => {
    const diagnostics: string[] = [];
    const received: WideEventEnvelope[] = [];
    const client = createWidekit({
      sinks: [
        {
          emit() {
            throw new Error("sink down");
          },
        },
        {
          emit(envelope) {
            received.push(envelope);
          },
        },
      ],
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_123");
    });

    expect(received).toHaveLength(1);
    expect(received[0]?.event["event.name"]).toBe("checkout");
    expect(diagnostics).toContain("sink.emit_failed");
  });

  test("rejects configuring both singular and plural Sinks", () => {
    expect(() =>
      createWidekit({
        sink: sinks.memory(),
        sinks: [sinks.memory()],
      }),
    ).toThrow("Configure either sink or sinks, not both.");
  });
});
