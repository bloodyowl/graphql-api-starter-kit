import { createUserToken } from "#app/tests/testTokens.mts";
import { assertEqual, testWithApp } from "#app/tests/testWithApp.mts";

import { suite } from "node:test";

suite("suspendPet", async () => {
  const userToken = createUserToken({ userId: crypto.randomUUID() });

  testWithApp("suspendPet", async ({ partner: { graphql, run } }) => {
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
      { input: { type: "Cat" } },
      userToken,
    );

    assertEqual(
      registration.registerPet.__typename,
      "RegisterPetSuccessPayload",
    );

    const suspensionReason = crypto.randomUUID();

    const suspension = await run(
      graphql(`
        mutation suspendPet($input: SuspendPetInput!) {
          suspendPet(input: $input) {
            __typename
            ... on SuspendPetSuccessPayload {
              pet {
                statusInfo {
                  __typename
                  status
                  ... on PetSuspendedStatusInfo {
                    suspensionReasion
                  }
                }
              }
            }
            ... on Rejection {
              message
            }
          }
        }
      `),
      { input: { id: registration.registerPet.pet.id, suspensionReason } },
      userToken,
    );

    assertEqual(suspension.suspendPet.__typename, "SuspendPetSuccessPayload");
    assertEqual(
      suspension.suspendPet.pet.statusInfo.__typename,
      "PetSuspendedStatusInfo",
    );
    assertEqual(suspension.suspendPet.pet.statusInfo.status, "Suspended");
    assertEqual(
      suspension.suspendPet.pet.statusInfo.suspensionReasion,
      suspensionReason,
    );
  });

  testWithApp(
    "suspendPet fails if on another user",
    async ({ partner: { graphql, run } }) => {
      const otherUserToken = createUserToken({ userId: crypto.randomUUID() });

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
        { input: { type: "Cat" } },
        userToken,
      );

      assertEqual(
        registration.registerPet.__typename,
        "RegisterPetSuccessPayload",
      );

      const suspensionReason = crypto.randomUUID();

      const suspension = await run(
        graphql(`
          mutation suspendPet($input: SuspendPetInput!) {
            suspendPet(input: $input) {
              __typename
              ... on SuspendPetSuccessPayload {
                pet {
                  statusInfo {
                    __typename
                    status
                    ... on PetSuspendedStatusInfo {
                      suspensionReasion
                    }
                  }
                }
              }
              ... on Rejection {
                message
              }
            }
          }
        `),
        { input: { id: registration.registerPet.pet.id, suspensionReason } },
        otherUserToken,
      );

      assertEqual(suspension.suspendPet.__typename, "UnauthorizedRejection");
    },
  );

  testWithApp(
    "suspendPet rejects if already suspended",
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
        { input: { type: "Cat" } },
        userToken,
      );

      assertEqual(
        registration.registerPet.__typename,
        "RegisterPetSuccessPayload",
      );

      const suspensionReason = crypto.randomUUID();

      const suspension = await run(
        graphql(`
          mutation suspendPet($input: SuspendPetInput!) {
            suspendPet(input: $input) {
              __typename
              ... on SuspendPetSuccessPayload {
                pet {
                  statusInfo {
                    __typename
                    status
                    ... on PetSuspendedStatusInfo {
                      suspensionReasion
                    }
                  }
                }
              }
              ... on Rejection {
                message
              }
            }
          }
        `),
        { input: { id: registration.registerPet.pet.id, suspensionReason } },
        userToken,
      );

      assertEqual(suspension.suspendPet.__typename, "SuspendPetSuccessPayload");
      assertEqual(
        suspension.suspendPet.pet.statusInfo.__typename,
        "PetSuspendedStatusInfo",
      );
      assertEqual(suspension.suspendPet.pet.statusInfo.status, "Suspended");
      assertEqual(
        suspension.suspendPet.pet.statusInfo.suspensionReasion,
        suspensionReason,
      );

      const suspensionAfterSuspension = await run(
        graphql(`
          mutation suspendPet($input: SuspendPetInput!) {
            suspendPet(input: $input) {
              __typename
              ... on SuspendPetSuccessPayload {
                pet {
                  statusInfo {
                    __typename
                    status
                    ... on PetSuspendedStatusInfo {
                      suspensionReasion
                    }
                  }
                }
              }
              ... on Rejection {
                message
              }
            }
          }
        `),
        { input: { id: registration.registerPet.pet.id, suspensionReason } },
        userToken,
      );

      assertEqual(
        suspensionAfterSuspension.suspendPet.__typename,
        "PetSuspendInvalidStatusRejection",
      );
    },
  );
});
