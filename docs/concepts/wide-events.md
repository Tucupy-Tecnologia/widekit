# Wide Events

A wide event is one flat dot-notated record emitted at lifecycle completion.

Widekit does not emit per-step log lines in v1. Application code enriches a `wideEvent` during execution, then Widekit emits the completed event once.

```json
{
  "event.name": "checkout",
  "timestamp": "2026-05-20T18:00:00.000Z",
  "service.name": "checkout-api",
  "duration.ms": 124,
  "outcome": "success",
  "user.id": "user_123",
  "payment.provider": "stripe"
}
```
