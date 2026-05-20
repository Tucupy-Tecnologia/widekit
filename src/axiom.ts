import type { WideEventEnvelope, WideEventSink } from "./core/types.ts";

export type AxiomSinkOptions = {
  token: string | undefined;
  dataset: string | undefined;
  orgId?: string;
  url?: string;
  fetch?: typeof fetch;
};

export function axiom(options: AxiomSinkOptions): WideEventSink {
  if (!options.token) {
    throw new Error("Axiom token is required.");
  }

  if (!options.dataset) {
    throw new Error("Axiom dataset is required.");
  }

  const fetchImpl = options.fetch ?? fetch;
  const baseUrl = options.url ?? "https://api.axiom.co";
  const ingestUrl = `${baseUrl}/v1/datasets/${encodeURIComponent(options.dataset)}/ingest`;

  return {
    async emit(envelope: WideEventEnvelope) {
      const response = await fetchImpl(ingestUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.token}`,
          "content-type": "application/json",
          ...(options.orgId ? { "x-axiom-org-id": options.orgId } : {}),
        },
        body: JSON.stringify([envelope.event]),
      });

      if (!response.ok) {
        throw new Error(`Axiom ingest failed with ${response.status}.`);
      }
    },
  };
}
