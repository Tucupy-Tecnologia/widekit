import type { WidekitClient } from "./core/client.ts";
import type { WideEventContext, WideEventFields } from "./core/types.ts";

export type BunWidekitOptions<Fields extends WideEventFields = WideEventFields> = {
  client: WidekitClient<Fields>;
  handler: (request: Request, wideEvent: WideEventContext<Fields>) => Response | Promise<Response>;
  eventName?: string;
  captureErrors?: boolean;
  includeRequest?: boolean;
  includeResponse?: boolean;
};

export function widekit<Fields extends WideEventFields = WideEventFields>(
  options: BunWidekitOptions<Fields>,
) {
  return async function widekitFetch(request: Request): Promise<Response> {
    const wideEvent = options.client.start(options.eventName ?? "http.request");

    if (options.includeRequest !== false) {
      const url = new URL(request.url);
      wideEvent.setBase({
        "http.request.method": request.method,
        "url.path": url.pathname,
        "url.scheme": url.protocol.replace(":", ""),
      });
    }

    try {
      const response = await options.handler(request, wideEvent);

      if (options.includeResponse !== false) {
        wideEvent.setBase("http.response.status_code", response.status);
        if (response.status >= 500) {
          wideEvent.setBase("outcome", "error");
        }
      }

      await wideEvent.finish();
      return response;
    } catch (error) {
      if (options.captureErrors !== false) {
        wideEvent.captureError(error);
      }

      await wideEvent.finish();
      throw error;
    }
  };
}
