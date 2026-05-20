import { createStart } from "@tanstack/react-start";
import { createWidekit } from "../dist/index.mjs";
import { widekit } from "../dist/tanstack-start.mjs";

const records = [];
const sink = {
  get events() {
    return records.map((record) => record.event);
  },
  emit(envelope) {
    records.push(envelope);
  },
};
const client = createWidekit({
  service: {
    name: "widekit-tanstack-start-smoke",
    environment: "local",
  },
  sink,
});
const requestMiddleware = widekit({ client });
const start = createStart(() => ({
  requestMiddleware: [requestMiddleware],
}));
const options = await start.getOptions();
const server = options.requestMiddleware?.[0]?.options.server;
const request = new Request("https://example.test/orders/1", {
  method: "GET",
});

if (!server) {
  throw new Error("TanStack Start smoke test did not register request middleware.");
}

const result = await server({
  request,
  pathname: "/orders/1",
  context: undefined,
  handlerType: "router",
  async next(input) {
    input?.context?.wideEvent?.set("route.id", "orders.show");
    return {
      request,
      pathname: "/orders/1",
      context: input?.context,
      response: new Response("ok", { status: 200 }),
    };
  },
});
const response = result instanceof Response ? result : result.response;
const wideEvent = sink.events[0];

if (response.status !== 200) {
  throw new Error(`Expected TanStack Start response status 200, got ${response.status}.`);
}

if (
  wideEvent?.["event.name"] !== "http.request" ||
  wideEvent["framework.name"] !== "tanstack-start" ||
  wideEvent["route.id"] !== "orders.show" ||
  wideEvent["http.response.status_code"] !== 200
) {
  throw new Error("TanStack Start smoke test did not emit the expected Wide Event.");
}

console.log(JSON.stringify(wideEvent, null, 2));
