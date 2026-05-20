# Standard Fields

Widekit's standard field dictionary defines the common flat dot-notated fields that products should use when sending wide events to Axiom.

The dictionary is available in code:

```ts
import { createWidekit, defineContract, field, standardContract, standardFields } from "widekit";

const contract = defineContract({
  ...standardContract.fields,
  "cart.total_cents": field.number({
    description: "Checkout cart total in cents.",
  }),
});

const client = createWidekit({
  contract,
});

await client.run("checkout", async (wideEvent) => {
  wideEvent.set(standardFields.productName, "traveltogether");
  wideEvent.set(standardFields.userId, "user_123");
  wideEvent.set("cart.total_cents", 1599);
});
```

`standardContract` is optional. Contractless usage remains first-class. Use the contract when a product wants type validation for the shared fields, then extend it with product-specific fields.

## Ownership

| Owner         | Meaning                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `widekit`     | Set by Widekit core when the lifecycle starts or finishes.                  |
| `adapter`     | Set by a framework adapter from request, response, route, or trace context. |
| `application` | Set by product code when it knows business or runtime context.              |

## Lifecycle

| Field         | Type   | Owner     | Description                                                             |
| ------------- | ------ | --------- | ----------------------------------------------------------------------- |
| `event.name`  | string | `widekit` | Stable lifecycle name, such as `checkout` or `clients.create`.          |
| `timestamp`   | string | `widekit` | ISO timestamp for when the wide event started.                          |
| `outcome`     | enum   | `widekit` | Final lifecycle outcome: `success`, `error`, `cancelled`, or `unknown`. |
| `duration.ms` | number | `widekit` | Lifecycle duration in milliseconds.                                     |

## Service And Deployment

| Field                         | Type   | Owner         | Description                                                     |
| ----------------------------- | ------ | ------------- | --------------------------------------------------------------- |
| `product.name`                | string | `application` | Product family that owns the service, such as `traveltogether`. |
| `service.name`                | string | `widekit`     | Runtime service name.                                           |
| `service.version`             | string | `widekit`     | Runtime service version or release identifier.                  |
| `deployment.environment.name` | string | `widekit`     | Deployment environment name.                                    |
| `cloud.region`                | string | `application` | Cloud or platform region where the lifecycle ran.               |
| `git.commit.sha`              | string | `application` | Git commit SHA for the deployed code.                           |

## Correlation

| Field        | Type   | Owner     | Description                                        |
| ------------ | ------ | --------- | -------------------------------------------------- |
| `request.id` | string | `adapter` | Request correlation ID shared across service hops. |
| `trace.id`   | string | `adapter` | Distributed trace identifier from trace context.   |
| `span.id`    | string | `adapter` | Distributed span identifier from trace context.    |

## HTTP

| Field                       | Type   | Owner     | Description                                     |
| --------------------------- | ------ | --------- | ----------------------------------------------- |
| `http.request.method`       | string | `adapter` | HTTP request method.                            |
| `http.response.status_code` | number | `adapter` | HTTP response status code.                      |
| `url.path`                  | string | `adapter` | URL path without scheme, host, or query string. |
| `url.scheme`                | string | `adapter` | URL scheme.                                     |
| `route.id`                  | string | `adapter` | Stable framework route identifier.              |

## Actor

| Field        | Type   | Owner         | Description                                             |
| ------------ | ------ | ------------- | ------------------------------------------------------- |
| `user.id`    | string | `application` | Authenticated user identifier.                          |
| `org.id`     | string | `application` | Organization, account, tenant, or workspace identifier. |
| `session.id` | string | `application` | Authenticated session identifier.                       |
| `actor.type` | string | `application` | Actor category for the lifecycle.                       |

## Error

| Field           | Type   | Owner         | Description                                        |
| --------------- | ------ | ------------- | -------------------------------------------------- |
| `error.type`    | string | `widekit`     | Error class, name, or thrown value category.       |
| `error.message` | string | `widekit`     | Error message safe for the configured destination. |
| `error.stack`   | string | `widekit`     | Error stack trace when stack emission is enabled.  |
| `error.code`    | string | `application` | Domain or platform error code.                     |

## Jobs

| Field            | Type   | Owner         | Description                              |
| ---------------- | ------ | ------------- | ---------------------------------------- |
| `job.id`         | string | `application` | Background job identifier.               |
| `job.name`       | string | `application` | Stable background job name.              |
| `queue.name`     | string | `application` | Queue name for background work.          |
| `attempt.number` | number | `application` | Current attempt number for retried work. |

## Axiom Queries

Find errors for one product:

```sql
['product.name'] == "traveltogether" and outcome == "error"
```

Find failed work for one organization:

```sql
['org.id'] == "org_123" and outcome == "error"
```

Find slow checkout events:

```sql
['event.name'] == "checkout" and ['duration.ms'] > 1000
```

Find all events for a deployment:

```sql
['git.commit.sha'] == "a1b2c3d"
```
