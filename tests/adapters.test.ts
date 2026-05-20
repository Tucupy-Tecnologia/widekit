import { Elysia } from "elysia";
import { describe, expect, test } from "vite-plus/test";
import { widekit as elysiaWidekit } from "../src/elysia.ts";
import { createWidekit } from "../src/index.ts";
import { memory } from "./helpers.ts";
import {
  widekit as tanStackStartWidekit,
  type TanStackStartWidekitContext,
} from "../src/tanstack-start.ts";

type TanStackRequestMiddlewareServer = (input: {
  request: Request;
  pathname: string;
  context?: unknown;
  handlerType: "router" | "serverFn";
  next(input?: { context?: unknown }): Promise<{
    request: Request;
    pathname: string;
    context: unknown;
    response: Response;
  }>;
}) => Promise<
  | Response
  | {
      request: Request;
      pathname: string;
      context: unknown;
      response: Response;
    }
>;

describe("framework adapters", () => {
  test("Elysia Adapter exposes a Wide Event Context and captures errors", async () => {
    const sink = memory();
    const client = createWidekit({ sink });
    const app = new Elysia()
      .use(elysiaWidekit({ client, frameworkName: "elysia-test" }))
      .patch("/orders/1", ({ wideEvent }) => {
        wideEvent.set("route.id", "orders.update");
        throw new Error("handler failed");
      });

    const response = await app.handle(
      new Request("https://example.test/orders/1", {
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(500);
    expect(sink.events[0]).toMatchObject({
      "event.name": "http.request",
      "framework.name": "elysia-test",
      "http.request.method": "PATCH",
      "url.path": "/orders/1",
      "url.scheme": "https",
      "http.response.status_code": 500,
      "route.id": "orders.update",
      outcome: "error",
      "error.message": "handler failed",
    });
  });

  test("TanStack Start Adapter passes the Wide Event Context to middleware", async () => {
    const sink = memory();
    const client = createWidekit({ sink });
    const middleware = tanStackStartWidekit({
      client,
      frameworkName: "tanstack-test",
    });
    const request = new Request("https://example.test/orders/1", {
      method: "GET",
    });
    const server = middleware.options.server as TanStackRequestMiddlewareServer | undefined;

    const result = await server?.({
      request,
      pathname: "/orders/1",
      handlerType: "router",
      async next(input) {
        const context = input?.context as TanStackStartWidekitContext | undefined;
        context?.wideEvent.set("route.id", "orders.show");
        return {
          request,
          pathname: "/orders/1",
          context: input?.context ?? {},
          response: new Response("accepted", { status: 202 }),
        };
      },
    });
    const response = result instanceof Response ? result : result?.response;

    expect(response?.status).toBe(202);
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
