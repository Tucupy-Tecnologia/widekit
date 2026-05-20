import { Elysia } from "elysia";
import { createWidekit } from "../dist/index.mjs";
import * as sinks from "../dist/sinks.mjs";
import { widekit } from "../dist/elysia.mjs";

const sink = sinks.memory();
const client = createWidekit({
  service: {
    name: "widekit-elysia-smoke",
    environment: "local",
  },
  sink,
});

const app = new Elysia().use(widekit({ client })).post("/checkout", ({ set, wideEvent }) => {
  set.status = 201;
  wideEvent.set("route.id", "checkout.create");
  wideEvent.set("cart.total_cents", 1599);
  return "created";
});

const response = await app.handle(
  new Request("https://example.test/checkout", {
    method: "POST",
  }),
);
const wideEvent = sink.events[0];

if (response.status !== 201) {
  throw new Error(`Expected Elysia response status 201, got ${response.status}.`);
}

if (
  wideEvent?.["event.name"] !== "http.request" ||
  wideEvent["framework.name"] !== "elysia" ||
  wideEvent["route.id"] !== "checkout.create" ||
  wideEvent["http.response.status_code"] !== 201
) {
  throw new Error("Elysia smoke test did not emit the expected Wide Event.");
}

console.log(JSON.stringify(wideEvent, null, 2));
