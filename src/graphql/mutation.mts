import { builder } from "#app/graphql/builder.mts";
import {
  registerPet,
  RegisterPetInput,
} from "#app/graphql/mutations/registerPet.mts";
import {
  suspendPet,
  SuspendPetInput,
} from "#app/graphql/mutations/suspendPet.mts";
import { PetRef } from "#app/graphql/objects/Pet.mts";
import { CannotRegisterPetRejection } from "#app/graphql/rejections/CannotRegisterPetRejection.mts";
import { UnauthorizedRejection } from "#app/graphql/rejections/UnauthorizedRejection.mts";

builder.mutationType({
  fields: t => ({
    registerPet: t.withAuth({ user: true }).field({
      type: PetRef,
      nullable: false,
      errors: {
        types: [UnauthorizedRejection, CannotRegisterPetRejection],
        dataField: {
          name: "pet",
        },
      },
      args: {
        input: t.arg({
          type: RegisterPetInput,
          required: true,
        }),
      },
      resolve: async (_, args, context) =>
        registerPet(args.input, context).resultToPromise(),
    }),
    suspendPet: t.withAuth({ user: true }).field({
      type: PetRef,
      nullable: false,
      subGraphs: ["partner"],
      errors: {
        types: [UnauthorizedRejection],
        dataField: {
          name: "pet",
        },
      },
      args: {
        input: t.arg({
          type: SuspendPetInput,
          required: true,
        }),
      },
      resolve: async (_, args, context) =>
        suspendPet(args.input, context).resultToPromise(),
    }),
  }),
});
