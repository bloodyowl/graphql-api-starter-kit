import { createProjectToken, createUserToken } from "#app/tests/testTokens.mts";
import {
  assertEqual,
  assertIsDefined,
  assertIsTrue,
  testWithApp,
} from "#app/tests/testWithApp.mts";

import { suite } from "node:test";

suite("userPets", async () => {
  const userId = crypto.randomUUID();
  const userToken = createUserToken({ userId });
  const otherUserToken = createUserToken({ userId: crypto.randomUUID() });
  const projectToken = createProjectToken({});

  testWithApp(
    "userPets only returns pets for which the user is owner",
    async ({ partner: { graphql, run } }) => {
      await run(
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

      await run(
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
        otherUserToken,
      );

      const pets = await run(
        graphql(`
          query userPets($userId: ID!) {
            user(id: $userId) {
              pets(first: 2) {
                edges {
                  node {
                    ownerId
                  }
                }
              }
            }
          }
        `),
        { userId },
        projectToken,
      );

      assertIsDefined(pets.user);
      assertEqual(pets.user.pets.edges.length, 1);
      assertIsTrue(
        pets.user.pets.edges.every(({ node }) => node.ownerId === userId),
      );
    },
  );
});
