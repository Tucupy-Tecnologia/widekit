import { describe, expect, test } from "vite-plus/test";
import { createWidekit } from "../src/index.ts";
import { memory } from "./helpers.ts";

describe("sampling", () => {
  test("keeps error wide events when configured", async () => {
    const sink = memory();
    const client = createWidekit({
      sink,
      sampling: {
        successRate: 0,
        keepErrors: true,
      },
    });

    await expect(
      client.run("checkout", () => {
        throw new Error("payment failed");
      }),
    ).rejects.toThrow("payment failed");

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({
      "event.name": "checkout",
      outcome: "error",
      "error.message": "payment failed",
    });
    expect(sink.records[0]?.metadata.sampling).toEqual({
      kept: true,
      reason: "error",
    });
  });

  test("keeps slow wide events before rate sampling", async () => {
    const sink = memory();
    const client = createWidekit({
      sink,
      sampling: {
        successRate: 0,
        keepSlowOverMs: 0,
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_123");
    });

    expect(sink.events).toHaveLength(1);
    expect(sink.records[0]?.metadata.sampling).toEqual({
      kept: true,
      reason: "slow",
    });
  });

  test("uses configured randomness for rate sampling", async () => {
    const sink = memory();
    const droppedReasons: string[] = [];
    const randomValues = [0.49, 0.51];
    const client = createWidekit({
      sink,
      sampling: {
        successRate: 0.5,
        random() {
          return randomValues.shift() ?? 1;
        },
      },
      onDrop(metadata) {
        droppedReasons.push(metadata.sampling.reason);
      },
    });

    await client.run("kept-checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_123");
    });
    await client.run("dropped-checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_456");
    });

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]?.["event.name"]).toBe("kept-checkout");
    expect(sink.records[0]?.metadata.sampling).toEqual({
      kept: true,
      reason: "rate",
    });
    expect(droppedReasons).toEqual(["unsampled"]);
  });

  test("records disabled sampling metadata without a policy", async () => {
    const sink = memory();
    const client = createWidekit({ sink });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set("user.id", "user_123");
    });

    expect(sink.records[0]?.metadata.sampling).toEqual({
      kept: true,
      reason: "disabled",
    });
  });
});
