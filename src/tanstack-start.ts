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

export type TanStackStartMiddlewareInput<Fields extends WideEventFields> = {
  request: Request;
  next(input?: {
    context?: {
      wideEvent: WideEventContext<Fields>;
    };
  }): Promise<TanStackStartMiddlewareResult>;
};

export type TanStackStartMiddlewareResult = {
  response?: Response;
};

export function widekit<Fields extends WideEventFields = WideEventFields>(
  options: TanStackStartWidekitOptions<Fields>,
) {
  return async function widekitTanStackStartMiddleware(
    input: TanStackStartMiddlewareInput<Fields>,
  ): Promise<TanStackStartMiddlewareResult> {
    const wideEvent = options.client.start(options.eventName ?? "http.request");

    wideEvent.setBase("framework.name", options.frameworkName ?? "tanstack-start");

    if (options.includeRequest !== false) {
      const url = new URL(input.request.url);
      wideEvent.setBase({
        "http.request.method": input.request.method,
        "url.path": url.pathname,
        "url.scheme": url.protocol.replace(":", ""),
      });
    }

    try {
      const result = await input.next({
        context: {
          wideEvent,
        },
      });

      if (options.includeResponse !== false && result.response) {
        wideEvent.setBase("http.response.status_code", result.response.status);
        if (result.response.status >= 500) {
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
  };
}
