# Testing

## Principles

- **Only test the boundaries of the app**: to reflect the reality
- **Quick feedback loop**: the test suites should run fast to allow for a fast watch mode
- **Executed in perfect isolation**, with its own mock database and kafka mock
- **Collocation**: tests should live next to what they test (in `__tests__` directories)

## Tooling

We use node.js's test runner, with `node:test` and `node:assert`.

## `testWithApp`

We provide a `testWithApp` helper that boots a new app context.

### Basic GraphQL test

```ts
testWithApp(
  "registerPet requires auth",
  async ({ partner: { graphql, run } }) => {
    // Execute the `registerPet` mutation on the exposed partner API
    const registration = await run(
      graphql(`
        mutation registerPet($input: RegisterPetInput!) {
          registerPet(input: $input) {
            __typename
            ... on RegisterPetSuccessPayload {
              pet {
                id
                type
                ownerId
              }
            }
            ... on Rejection {
              message
            }
          }
        }
      `),
      { input: { type: "Dog" } },
    );

    // Assert that the error message is correct
    assertTypename(
      registration.registerPet.__typename,
      "UnauthorizedRejection",
    );
  },
);
```

### GraphQL test with assertion on DB

```ts
const userToken = createUserToken({ userId: crypto.randomUUID() });

testWithApp(
  "registerPet can create a pet",
  async ({ partner: { graphql, run }, db }) => {
    const registration = await run(
      graphql(`
        mutation registerPet($input: RegisterPetInput!) {
          registerPet(input: $input) {
            __typename
            ... on RegisterPetSuccessPayload {
              pet {
                id
                type
                ownerId
              }
            }
            ... on Rejection {
              message
            }
          }
        }
      `),
      { input: { type: "Cat" } },
      userToken,
    );
    assertTypename(
      registration.registerPet.__typename,
      "RegisterPetSuccessPayload",
    );
    assertIsDefined(registration.registerPet.pet.id);

    const outbox = await db
      .selectFrom("Outbox")
      .selectAll()
      .where("type", "=", "PetCreated")
      .where("aggregateId", "=", registration.registerPet.pet.id)
      .executeTakeFirst();

    assertIsDefined(outbox);
  },
);
```

### Test kafka event consumption

```ts
testWithApp(
  "identity deleted event deletes associated pets",
  async ({ partner: { graphql, run }, kafka, db }) => {
    const registration = await run(
      graphql(`
        mutation registerPet($input: RegisterPetInput!) {
          registerPet(input: $input) {
            __typename
            ... on RegisterPetSuccessPayload {
              pet {
                id
                type
                ownerId
              }
            }
            ... on Rejection {
              message
            }
          }
        }
      `),
      { input: { type: "Cat" } },
      userToken,
    );
    assertTypename(
      registration.registerPet.__typename,
      "RegisterPetSuccessPayload",
    );
    assertIsDefined(registration.registerPet.pet.id);

    const query = await run(
      graphql(`
        query getPet($id: ID!) {
          pet(id: $id) {
            id
            type
            ownerId
          }
        }
      `),
      { id: registration.registerPet.pet.id },
      userToken,
    );

    assertIsDefined(query.pet);
    assertIsDefined(query.pet.id);

    await kafka.receive({
      topic: "identityEvents",
      partition: 0,
      message: {
        key: crypto.randomUUID(),
        value: {
          $type: "io.swan.events.identityEvents.IdentityEvent",
          event: {
            $case: "identityDeleted",
            identityDeleted: {
              $type: "io.swan.events.identityEvents.IdentityDeletedEvent",
              userId,
            },
          },
        },
        headers: {},
      },
    });

    const queryAfterDeletion = await run(
      graphql(`
        query getPet($id: ID!) {
          pet(id: $id) {
            id
            type
            ownerId
          }
        }
      `),
      { id: registration.registerPet.pet.id },
      userToken,
    );

    assertIsNotDefined(queryAfterDeletion.pet);

    const outbox = await db
      .selectFrom("Outbox")
      .selectAll()
      .where("type", "=", "PetDeleted")
      .where("aggregateId", "=", registration.registerPet.pet.id)
      .executeTakeFirst();

    assertIsDefined(outbox);
  },
);
```
