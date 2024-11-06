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
- `t`: Translator

## EventContext

Provides:

- `db`: Database
- `kafka`: Kafka
- `log`: Fastify logger;
- `featureFlags`: Feature flags
- `partnerClient`: GQL client for the partner API
- `t`: Translator

## Recipes

### Use a feature flag

#### As a guard

```ts
const myFlag = context.featureFlags
  .get("myFlag", false)
  .map(value =>
    Option.fromPredicate(value, x => x).toResult(new UnauthorizedRejection()),
  );

return myFlag.flatMapOk(myFlag => {
  // flag active and auth is `User` in this branch
});
```

#### As a filter

```ts
const myFlag = context.featureFlags.get("myFlag", false);

myFlag.flatMap(myFlag => getUser({ myFlag }));
```
