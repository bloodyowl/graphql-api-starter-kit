import { builder } from "#app/graphql/partner/builder.mts";
import {
  registerPet,
  RegisterPetInput,
} from "#app/graphql/partner/mutations/registerPet.mts";
import { CannotRegisterPetRejection } from "#app/graphql/rejections/CannotRegisterPetRejection.mts";
import { UnauthorizedRejection } from "#app/graphql/rejections/UnauthorizedRejection.mts";
import { PetRef } from "./objects/Pet.mts";

builder.mutationType({
  fields: t => ({
    registerPet: t.field({
      type: PetRef,
      nullable: false,
      errors: {
        types: [UnauthorizedRejection, CannotRegisterPetRejection],
        dataField: {
          name: "pet",
        },
      },
      args: { input: t.arg({ type: RegisterPetInput, required: true }) },
      resolve: async (_, args, context) =>
        registerPet(args.input, context).resultToPromise(),
    }),
  }),
});
