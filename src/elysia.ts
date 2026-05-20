import { Elysia } from "elysia";
import type { WidekitClient } from "./core/client.ts";
import type { WideEventContext, WideEventFields } from "./core/types.ts";

export type ElysiaWidekitOptions<Fields extends WideEventFields = WideEventFields> = {
  client: WidekitClient<Fields>;
  eventName?: string;
  captureErrors?: boolean;
  includeRequest?: boolean;
  includeResponse?: boolean;
  frameworkName?: string;
};

export function widekit<Fields extends WideEventFields = WideEventFields>(
  options: ElysiaWidekitOptions<Fields>,
) {
  return new Elysia({ name: "widekit" })
    .derive({ as: "global" }, ({ request }) => {
      const wideEvent = options.client.start(options.eventName ?? "http.request");

      wideEvent.setBase("framework.name", options.frameworkName ?? "elysia");

      if (options.includeRequest !== false) {
        const url = new URL(request.url);
        wideEvent.setBase({
          "http.request.method": request.method,
          "url.path": url.pathname,
          "url.scheme": url.protocol.replace(":", ""),
        });
      }

      return { wideEvent };
    })
    .onError(async ({ wideEvent, error, set }) => {
      if (!wideEvent) return;

      if (options.captureErrors !== false) {
        wideEvent.captureError(error);
      }

      if (options.includeResponse !== false) {
        setResponseStatus(wideEvent, toStatusCode(set.status) ?? 500);
      }

      await wideEvent.finish();
    })
    .mapResponse(async ({ wideEvent, response, responseValue, set }) => {
      if (!wideEvent) return;

      if (options.includeResponse !== false) {
        setResponseStatus(wideEvent, getResponseStatus(responseValue ?? response, set.status));
      }

      await wideEvent.finish();
    })
    .as("global");
}

function getResponseStatus(response: unknown, fallback: number | string | undefined): number {
  if (response instanceof Response) return response.status;
  return toStatusCode(fallback) ?? 200;
}

function setResponseStatus<Fields extends WideEventFields>(
  wideEvent: WideEventContext<Fields>,
  status: number,
) {
  wideEvent.setBase("http.response.status_code", status);
  if (status >= 500) {
    wideEvent.setBase("outcome", "error");
  }
}

function toStatusCode(status: number | string | undefined): number | undefined {
  if (typeof status === "number") return status;
  if (typeof status === "string") {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
