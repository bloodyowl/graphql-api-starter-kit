import { createUserToken } from "#app/tests/testTokens.mts";
import {
  assertEqual,
  assertIsDefined,
  testWithApp,
} from "#app/tests/testWithApp.mts";

import { suite } from "node:test";

suite("registerPet", async () => {
  const userToken = createUserToken({ userId: crypto.randomUUID() });

  testWithApp(
    "registerPet requires auth",
    async ({ partner: { graphql, run }, t }) => {
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

      assertEqual(registration.registerPet.__typename, "UnauthorizedRejection");
      assertEqual(
        registration.registerPet.message,
        t("rejection.UnauthorizedRejection"),
      );
    },
  );

  testWithApp(
    "registerPet can create a pet",
    async ({ partner: { graphql, run }, db }) => {
      const description = crypto.randomUUID();
      const registration = await run(
        graphql(`
          mutation registerPet($input: RegisterPetInput!) {
            registerPet(input: $input) {
              __typename
              ... on RegisterPetSuccessPayload {
                pet {
                  id
                  type
                  description
                  ownerId
                  statusInfo {
                    status
                  }
                }
              }
              ... on Rejection {
                message
              }
            }
          }
        `),
        { input: { type: "Cat", description } },
        userToken,
      );
      assertEqual(
        registration.registerPet.__typename,
        "RegisterPetSuccessPayload",
      );
      assertIsDefined(registration.registerPet.pet.id);
      assertEqual(registration.registerPet.pet.description, description);
      assertEqual(registration.registerPet.pet.statusInfo.status, "Active");

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

      assertEqual(registration.registerPet.__typename, "ValidationRejection");
    },
  );
});
