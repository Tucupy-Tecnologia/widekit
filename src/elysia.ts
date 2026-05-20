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

type ElysiaLike<Fields extends WideEventFields> = {
  derive(
    options: { as: "global" },
    handler: (context: { request: Request }) => { wideEvent: WideEventContext<Fields> },
  ): ElysiaLike<Fields>;
  onError(
    handler: (context: {
      wideEvent?: WideEventContext<Fields>;
      error: unknown;
      set?: { status?: number | string };
    }) => void,
  ): ElysiaLike<Fields>;
  onAfterResponse(
    handler: (context: {
      wideEvent?: WideEventContext<Fields>;
      set?: { status?: number | string };
    }) => void | Promise<void>,
  ): ElysiaLike<Fields>;
};

export function widekit<Fields extends WideEventFields = WideEventFields>(
  options: ElysiaWidekitOptions<Fields>,
) {
  return function widekitElysiaPlugin(app: ElysiaLike<Fields>) {
    return app
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
      .onError(({ wideEvent, error, set }) => {
        if (!wideEvent || options.captureErrors === false) return;

        wideEvent.captureError(error);
        const status = toStatusCode(set?.status);
        if (status !== undefined) {
          wideEvent.setBase("http.response.status_code", status);
        }
      })
      .onAfterResponse(async ({ wideEvent, set }) => {
        if (!wideEvent) return;

        if (options.includeResponse !== false) {
          const status = toStatusCode(set?.status) ?? 200;
          wideEvent.setBase("http.response.status_code", status);
          if (status >= 500) {
            wideEvent.setBase("outcome", "error");
          }
        }

        await wideEvent.finish();
      });
  };
}

function toStatusCode(status: number | string | undefined): number | undefined {
  if (typeof status === "number") return status;
  if (typeof status === "string") {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
