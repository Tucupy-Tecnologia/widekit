# Redaction

Widekit does not include redaction presets and does not infer sensitive data from field names.

Application owners configure redaction explicitly with a hook.

```ts
const client = createWidekit({
  redaction(event) {
    const redacted = { ...event };
    delete redacted["request.headers.authorization"];
    redacted["user.email"] = "[redacted]";
    return redacted;
  },
});
```

Sampling runs before redaction. Sinks receive sampled and redacted events.
