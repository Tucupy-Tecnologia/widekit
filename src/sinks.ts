import type { WideEventEnvelope, WideEventSink } from "./core/types.ts";

export type MemorySink = WideEventSink & {
  readonly records: readonly WideEventEnvelope[];
  readonly events: readonly WideEventEnvelope["event"][];
  clear(): void;
};

export function memory(): MemorySink {
  const records: WideEventEnvelope[] = [];

  return {
    records,
    get events() {
      return records.map((record) => record.event);
    },
    emit(envelope) {
      records.push(envelope);
    },
    clear() {
      records.length = 0;
    },
  };
}

export function console(): WideEventSink {
  return {
    emit(envelope) {
      globalThis.console.log(JSON.stringify(envelope.event));
    },
  };
}
