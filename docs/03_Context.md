# Context

Given the situation (handling an incoming request or incoming message), you have two kinds of contexts at your disposal:

## RequestContext

Provides:

- `db`: Database
- `kafka`: Kafka
- `auth`: Authentication information
- `request`: Fastify request
- `reply`: Fastify reply
- `log`: Fastify logger;
- `featureFlags`: Feature flags
- `partnerClient`: GQL client for the partner API

## EventContext

Provides:

- `db`: Database
- `kafka`: Kafka
- `log`: Fastify logger;
- `featureFlags`: Feature flags
- `partnerClient`: GQL client for the partner API

## Recipes

### Use a feature flag

#### As a guard

```ts
const myFlag = context.featureFlags
  .get("myFlag", false)
  .map(value =>
    Option.fromPredicate(value, x => x).toResult(new UnauthorizedRejection()),
  );

const auth = filterAuth(auth, { type: "User" });

return Future.allFromDict({ myFlag, auth })
  .map(Result.allFromDict)
  .flatMapOk(({ myFlag, auth }) => {
    // flag active and auth is `User` in this branch
  });
```

#### As a filter

```ts
const myFlag = context.featureFlags
  .get("myFlag", false)
  .map(value =>
    Option.fromPredicate(value, x => x).toResult(new UnauthorizedRejection()),
  );

const auth = filterAuth(auth, { type: "User" });

return Future.allFromDict({ myFlag, auth })
  .mapOkToResult(({ myFlag, auth }) => auth.map(auth => ({ auth, myFlag })))
  .flatMapOk(({ myFlag, auth }) => {
    // flag active or inactive and auth is `User` in this branch
  });
```
