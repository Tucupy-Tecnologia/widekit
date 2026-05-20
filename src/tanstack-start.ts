import { createMiddleware } from "@tanstack/react-start";
import type { WidekitClient } from "./core/client.ts";
import type { WideEventContext, WideEventFields } from "./core/types.ts";

export type TanStackStartWidekitOptions<Fields extends WideEventFields = WideEventFields> = {
  client: WidekitClient<Fields>;
  eventName?: string;
  captureErrors?: boolean;
  includeRequest?: boolean;
  includeResponse?: boolean;
  frameworkName?: string;
};

export type TanStackStartWidekitContext<Fields extends WideEventFields = WideEventFields> = {
  wideEvent: WideEventContext<Fields>;
};

export function widekit<Fields extends WideEventFields = WideEventFields>(
  options: TanStackStartWidekitOptions<Fields>,
) {
  return createMiddleware().server(async ({ request, next }) => {
    const wideEvent = options.client.start(options.eventName ?? "http.request");

    wideEvent.setBase("framework.name", options.frameworkName ?? "tanstack-start");

    if (options.includeRequest !== false) {
      const url = new URL(request.url);
      wideEvent.setBase({
        "http.request.method": request.method,
        "url.path": url.pathname,
        "url.scheme": url.protocol.replace(":", ""),
      });
    }

    try {
      const result = await next({
        context: {
          wideEvent,
        } satisfies TanStackStartWidekitContext<Fields>,
      });
      const response = result instanceof Response ? result : result.response;

      if (options.includeResponse !== false && response) {
        wideEvent.setBase("http.response.status_code", response.status);
        if (response.status >= 500) {
          wideEvent.setBase("outcome", "error");
        }
      }

      await wideEvent.finish();
      return result;
    } catch (error) {
      if (options.captureErrors !== false) {
        wideEvent.captureError(error);
      }

      await wideEvent.finish();
      throw error;
    }
  });
}
