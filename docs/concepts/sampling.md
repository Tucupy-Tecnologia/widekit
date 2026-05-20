# Sampling

Sampling is a core v1 feature. It evaluates the completed wide event before redaction and before sinks receive the event.

```ts
const client = createWidekit({
  sampling: {
    successRate: 0.05,
    keepErrors: true,
    keepSlowOverMs: 2_000,
    keepWhen(event) {
      return event["user.plan"] === "enterprise";
    },
  },
});
```

Dropped events do not reach sinks. Drop metadata can be observed with `onDrop`.
