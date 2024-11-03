import { createUserToken } from "#app/tests/testTokens.mts";
import {
  assertIsDefined,
  assertTypename,
  testWithApp,
} from "#app/tests/testWithApp.mts";

import { suite } from "node:test";

const userToken = createUserToken({ userId: crypto.randomUUID() });

suite("registerTest", async () => {
  testWithApp(
    "registerPet requires auth",
    async ({ partner: { graphql, run } }) => {
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
      assertTypename(
        registration.registerPet.__typename,
        "UnauthorizedRejection",
      );
    },
  );

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

  testWithApp(
    "registerPet disallows Giraffe",
    async ({ partner: { graphql, run } }) => {
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
        { input: { type: "Giraffe" } },
        userToken,
      );

      assertTypename(
        registration.registerPet.__typename,
        "ValidationRejection",
      );
    },
  );
});
