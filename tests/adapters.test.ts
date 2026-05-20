import { describe, expect, test } from "vite-plus/test";
import { widekit as bunWidekit } from "../src/bun.ts";
import { widekit as elysiaWidekit } from "../src/elysia.ts";
import { createWidekit } from "../src/index.ts";
import * as sinks from "../src/sinks.ts";
import { widekit as tanStackStartWidekit } from "../src/tanstack-start.ts";

describe("framework adapters", () => {
  test("Bun Adapter emits request and response fields", async () => {
    const sink = sinks.memory();
    const client = createWidekit({ sink });
    const fetch = bunWidekit({
      client,
      handler(request, wideEvent) {
        wideEvent.set("handler.url", request.url);
        return new Response("created", { status: 201 });
      },
    });

    const response = await fetch(
      new Request("https://example.test/checkout?cart=1", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.text()).toBe("created");
    expect(sink.events[0]).toMatchObject({
      "event.name": "http.request",
      "http.request.method": "POST",
      "url.path": "/checkout",
      "url.scheme": "https",
      "http.response.status_code": 201,
      "handler.url": "https://example.test/checkout?cart=1",
      outcome: "success",
    });
  });

  test("Elysia Adapter exposes a Wide Event Context and captures errors", async () => {
    const sink = sinks.memory();
    const client = createWidekit({ sink });
    type Context = ReturnType<typeof client.start>;
    type ErrorHandler = (context: {
      wideEvent?: Context;
      error: unknown;
      set?: { status?: number | string };
    }) => void;
    type AfterResponseHandler = (context: {
      wideEvent?: Context;
      set?: { status?: number | string };
    }) => void | Promise<void>;

    let deriveHandler:
      | ((context: { request: Request }) => {
          wideEvent: Context;
        })
      | undefined;
    let errorHandler: ErrorHandler | undefined;
    let afterResponseHandler: AfterResponseHandler | undefined;
    const app = {
      derive(
        _options: { as: "global" },
        handler: (context: { request: Request }) => {
          wideEvent: Context;
        },
      ) {
        deriveHandler = handler;
        return this;
      },
      onError(handler: ErrorHandler) {
        errorHandler = handler;
        return this;
      },
      onAfterResponse(handler: AfterResponseHandler) {
        afterResponseHandler = handler;
        return this;
      },
    };

    elysiaWidekit({ client, frameworkName: "elysia-test" })(app);
    const { wideEvent } = deriveHandler?.({
      request: new Request("https://example.test/orders/1", {
        method: "PATCH",
      }),
    }) ?? { wideEvent: undefined };

    expect(wideEvent).toBeDefined();
    wideEvent?.set("route.id", "orders.update");
    errorHandler?.({
      wideEvent,
      error: new Error("handler failed"),
      set: { status: "503" },
    });
    await afterResponseHandler?.({
      wideEvent,
      set: { status: "503" },
    });

    expect(sink.events[0]).toMatchObject({
      "event.name": "http.request",
      "framework.name": "elysia-test",
      "http.request.method": "PATCH",
      "url.path": "/orders/1",
      "url.scheme": "https",
      "http.response.status_code": 503,
      "route.id": "orders.update",
      outcome: "error",
      "error.message": "handler failed",
    });
  });

  test("TanStack Start Adapter passes the Wide Event Context to middleware", async () => {
    const sink = sinks.memory();
    const client = createWidekit({ sink });
    const middleware = tanStackStartWidekit({
      client,
      frameworkName: "tanstack-test",
    });

    const result = await middleware({
      request: new Request("https://example.test/orders/1", {
        method: "GET",
      }),
      async next(input) {
        input?.context?.wideEvent.set("route.id", "orders.show");
        return {
          response: new Response("accepted", { status: 202 }),
        };
      },
    });

    expect(result.response?.status).toBe(202);
    expect(sink.events[0]).toMatchObject({
      "event.name": "http.request",
      "framework.name": "tanstack-test",
      "http.request.method": "GET",
      "url.path": "/orders/1",
      "url.scheme": "https",
      "http.response.status_code": 202,
      "route.id": "orders.show",
      outcome: "success",
    });
  });
});
