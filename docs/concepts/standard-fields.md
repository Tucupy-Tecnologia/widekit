# Standard Fields

Widekit's standard field dictionary defines only the base observability fields that Widekit core or framework adapters can set consistently across products.

It intentionally does not include application or product logic fields such as `product.name`, `user.id`, `org.id`, `job.name`, or `cart.total_cents`. Define those in product-specific contracts when a product actually has that concept.

The dictionary is available in code:

```ts
import { createWidekit, defineContract, field, standardContract } from "widekit";

const contract = defineContract({
  ...standardContract.fields,
  "product.name": field.string({
    description: "Product family that owns this service.",
  }),
  "user.id": field.string({
    description: "Authenticated user identifier.",
  }),
  "cart.total_cents": field.number({
    description: "Checkout cart total in cents.",
  }),
});

const client = createWidekit({
  contract,
});

await client.run("checkout", async (wideEvent) => {
  wideEvent.set("product.name", "traveltogether");
  wideEvent.set("user.id", "user_123");
  wideEvent.set("cart.total_cents", 1599);
});
```

`standardContract` is optional. Contractless usage remains first-class. Use the contract when a product wants type validation for the shared base fields, then extend it with product-specific fields.

## Ownership

| Owner     | Meaning                                                                     |
| --------- | --------------------------------------------------------------------------- |
| `widekit` | Set by Widekit core when the lifecycle starts or finishes.                  |
| `adapter` | Set by a framework adapter from request, response, route, or trace context. |

## Lifecycle

| Field         | Type   | Owner     | Description                                                             |
| ------------- | ------ | --------- | ----------------------------------------------------------------------- |
| `event.name`  | string | `widekit` | Stable lifecycle name, such as `checkout` or `clients.create`.          |
| `timestamp`   | string | `widekit` | ISO timestamp for when the wide event started.                          |
| `outcome`     | enum   | `widekit` | Final lifecycle outcome: `success`, `error`, `cancelled`, or `unknown`. |
| `duration.ms` | number | `widekit` | Lifecycle duration in milliseconds.                                     |

## Service And Deployment

| Field                         | Type   | Owner     | Description                                    |
| ----------------------------- | ------ | --------- | ---------------------------------------------- |
| `service.name`                | string | `widekit` | Runtime service name.                          |
| `service.version`             | string | `widekit` | Runtime service version or release identifier. |
| `deployment.environment.name` | string | `widekit` | Deployment environment name.                   |

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

## Error

| Field           | Type   | Owner     | Description                                        |
| --------------- | ------ | --------- | -------------------------------------------------- |
| `error.type`    | string | `widekit` | Error class, name, or thrown value category.       |
| `error.message` | string | `widekit` | Error message safe for the configured destination. |
| `error.stack`   | string | `widekit` | Error stack trace when stack emission is enabled.  |

## Product Extensions

Products should define their own contract fields for business concepts they actually have.

Common extension fields can still be consistent across products when they apply:

| Field              | Type   | Use When                                      |
| ------------------ | ------ | --------------------------------------------- |
| `product.name`     | string | The organization wants product-level queries. |
| `user.id`          | string | The lifecycle has an authenticated user.      |
| `org.id`           | string | The lifecycle has an organization or tenant.  |
| `session.id`       | string | The lifecycle has an authenticated session.   |
| `actor.type`       | string | The actor can be a user, system, or API key.  |
| `error.code`       | string | The product has domain error codes.           |
| `job.name`         | string | The lifecycle is background work.             |
| `queue.name`       | string | The lifecycle came from a queue.              |
| `attempt.number`   | number | The lifecycle can retry.                      |
| `git.commit.sha`   | string | The deployment exposes a commit SHA.          |
| `cloud.region`     | string | The runtime exposes a region.                 |
| `cart.total_cents` | number | The product has checkout or cart context.     |

## Axiom Queries

Find errors for one service:

```sql
['service.name'] == "traveltogether-web" and outcome == "error"
```

Find slow checkout events after a product extends the contract with `event.name` usage:

```sql
['event.name'] == "checkout" and ['duration.ms'] > 1000
```

Find failed work for one organization after the product adds `org.id`:

```sql
['org.id'] == "org_123" and outcome == "error"
```
