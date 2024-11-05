import { createUserToken } from "#app/tests/testTokens.mts";
import {
  assertDeepEqual,
  assertEqual,
  assertIsDefined,
  testWithApp,
} from "#app/tests/testWithApp.mts";

import { suite } from "node:test";

suite("pets", async () => {
  const userId = crypto.randomUUID();
  const userToken = createUserToken({ userId });

  testWithApp("pets", async ({ partner: { graphql, run } }) => {
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
      { input: { type: "Dog" } },
      userToken,
    );

    const pets = await run(
      graphql(`
        query pets {
          pets(first: 2) {
            edges {
              node {
                type
              }
            }
          }
        }
      `),
      {},
      userToken,
    );

    assertIsDefined(pets.pets);
    assertEqual(pets.pets.edges.length, 2);
    assertDeepEqual(
      pets.pets.edges.map(({ node }) => node.type),
      ["Cat", "Dog"],
    );
  });
});
