import { createStart } from "@tanstack/react-start";
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

describe("real framework smoke tests", () => {
  test("Elysia app emits a Wide Event for a handled request", async () => {
    const sink = memory();
    const client = createWidekit({ sink });
    const app = new Elysia()
      .use(elysiaWidekit({ client, frameworkName: "elysia-real" }))
      .post("/checkout", ({ set, wideEvent }) => {
        set.status = 201;
        wideEvent.set("route.id", "checkout.create");
        return "created";
      });

    const response = await app.handle(
      new Request("https://example.test/checkout", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.text()).toBe("created");
    expect(sink.events[0]).toMatchObject({
      "event.name": "http.request",
      "framework.name": "elysia-real",
      "http.request.method": "POST",
      "url.path": "/checkout",
      "url.scheme": "https",
      "http.response.status_code": 201,
      "route.id": "checkout.create",
      outcome: "success",
    });
  });

  test("TanStack Start accepts Widekit as request middleware", async () => {
    const sink = memory();
    const client = createWidekit({ sink });
    const requestMiddleware = tanStackStartWidekit({
      client,
      frameworkName: "tanstack-real",
    });
    const start = createStart(() => ({
      requestMiddleware: [requestMiddleware],
    }));
    const options = await start.getOptions();
    const request = new Request("https://example.test/orders/1", {
      method: "GET",
    });
    const server = options.requestMiddleware?.[0]?.options.server as
      | TanStackRequestMiddlewareServer
      | undefined;

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
          response: new Response("ok", { status: 200 }),
        };
      },
    });
    const response = result instanceof Response ? result : result?.response;

    expect(response?.status).toBe(200);
    expect(sink.events[0]).toMatchObject({
      "event.name": "http.request",
      "framework.name": "tanstack-real",
      "http.request.method": "GET",
      "url.path": "/orders/1",
      "url.scheme": "https",
      "http.response.status_code": 200,
      "route.id": "orders.show",
      outcome: "success",
    });
  });
});
