import { createUserToken } from "#app/tests/testTokens.mts";
import {
  assertEqual,
  assertIsDefined,
  assertIsNotDefined,
  testWithApp,
} from "#app/tests/testWithApp.mts";

import { suite } from "node:test";

const userId = crypto.randomUUID();
const userToken = createUserToken({ userId });

suite("identity events", async () => {
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

      assertEqual(
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
});
