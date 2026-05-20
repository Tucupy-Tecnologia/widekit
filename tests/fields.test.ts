import { describe, expect, test } from "vite-plus/test";
import {
  createWidekit,
  defineContract,
  field,
  standardContract,
  standardFieldDictionary,
  standardFields,
} from "../src/index.ts";
import * as sinks from "../src/sinks.ts";

describe("standard fields", () => {
  test("exposes canonical field names for production-wide events", () => {
    expect(standardFields.eventName).toBe("event.name");
    expect(standardFields.durationMs).toBe("duration.ms");
    expect(standardFields.httpResponseStatusCode).toBe("http.response.status_code");
    expect(standardFields.userId).toBe("user.id");
    expect(standardFields.orgId).toBe("org.id");
    expect(standardFields.productName).toBe("product.name");
  });

  test("keeps standard field constants, dictionary, and contract in sync", () => {
    const fieldNames = Object.values(standardFields);
    const uniqueFieldNames = new Set(fieldNames);

    expect(uniqueFieldNames.size).toBe(fieldNames.length);
    expect(Object.keys(standardFieldDictionary).sort()).toEqual([...uniqueFieldNames].sort());
    expect(Object.keys(standardContract.fields).sort()).toEqual([...uniqueFieldNames].sort());
  });

  test("describes how each standard field should be owned and queried", () => {
    expect(standardFieldDictionary[standardFields.serviceName]).toMatchObject({
      category: "service",
      owner: "widekit",
      kind: "string",
    });
    expect(standardFieldDictionary[standardFields.requestId]).toMatchObject({
      category: "correlation",
      owner: "adapter",
      kind: "string",
    });
    expect(standardFieldDictionary[standardFields.userId]).toMatchObject({
      category: "actor",
      owner: "application",
      kind: "string",
    });
  });

  test("standard contract validates standard field types", async () => {
    const diagnostics: string[] = [];
    const client = createWidekit({
      contract: standardContract,
      sink: sinks.memory(),
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.setBase(standardFields.httpResponseStatusCode, "200");
    });

    expect(diagnostics).toContain("contract.invalid_field");
  });

  test("standard contract can be extended with product fields", async () => {
    const sink = sinks.memory();
    const diagnostics: string[] = [];
    const contract = defineContract({
      ...standardContract.fields,
      "cart.total_cents": field.number({
        description: "Checkout cart total in cents.",
      }),
    });
    const client = createWidekit({
      service: {
        name: "checkout-api",
        version: "1.0.0",
        environment: "test",
      },
      contract,
      sink,
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code);
      },
    });

    await client.run("checkout", (wideEvent) => {
      wideEvent.set(standardFields.productName, "traveltogether");
      wideEvent.set(standardFields.userId, "user_123");
      wideEvent.set("cart.total_cents", 1599);
    });

    expect(diagnostics).toEqual([]);
    expect(sink.events[0]).toMatchObject({
      [standardFields.eventName]: "checkout",
      [standardFields.productName]: "traveltogether",
      [standardFields.userId]: "user_123",
      "cart.total_cents": 1599,
    });
  });
});
