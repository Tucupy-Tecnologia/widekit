import { describe, expect, test } from "vite-plus/test";
import { axiom } from "../src/axiom.ts";
import type { WideEventEnvelope } from "../src/index.ts";

function envelope(event: WideEventEnvelope["event"]): WideEventEnvelope {
  return {
    event,
    metadata: {
      diagnostics: [],
      sampling: {
        kept: true,
        reason: "disabled",
      },
    },
  };
}

describe("Axiom Sink", () => {
  test("requires token and dataset configuration", () => {
    expect(() => axiom({ token: undefined, dataset: "wide-events" })).toThrow(
      "Axiom token is required.",
    );
    expect(() => axiom({ token: "token_123", dataset: undefined })).toThrow(
      "Axiom dataset is required.",
    );
  });

  test("posts wide events to the configured dataset ingest endpoint", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const sink = axiom({
      token: "token_123",
      dataset: "wide/events",
      orgId: "org_123",
      url: "https://axiom.test",
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
        outcome: "success",
      }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://axiom.test/v1/datasets/wide%2Fevents/ingest");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer token_123",
      "content-type": "application/json",
      "x-axiom-org-id": "org_123",
    });
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify([
        {
          "event.name": "checkout",
          outcome: "success",
        },
      ]),
    );
  });

  test("throws when the ingest endpoint rejects a wide event", async () => {
    const sink = axiom({
      token: "token_123",
      dataset: "wide-events",
      url: "https://axiom.test",
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
    ).rejects.toThrow("Axiom ingest failed with 503.");
  });
});
