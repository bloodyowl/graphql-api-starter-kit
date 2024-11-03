import { builder } from "#app/graphql/partner/builder.mts";
import { PetRef, PetType } from "#app/graphql/partner/objects/Pet.mts";
import { PetConnection } from "#app/graphql/partner/objects/PetConnection.mts";
import { type PetArgs, pets } from "#app/graphql/partner/queries/pets.mts";
import {
  decodeArgs,
  encodeArgs,
  type EncodedArgs,
} from "#app/utils/pagination.mts";

import { Future, Result } from "@swan-io/boxed";

builder.queryType({
  fields: t => ({
    pet: t.field({
      type: PetRef,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: (_, args) => args.id,
    }),
    pets: t.loadable({
      type: PetConnection,
      args: {
        ...t.arg.connectionArgs(),
        types: t.arg({ type: [PetType] }),
      },
      load: async (argsValues: EncodedArgs<PetArgs>[], context) =>
        Future.all(argsValues.map(args => pets(decodeArgs(args), context)))
          .map(Result.all)
          .resultToPromise(),
      resolve: (_, args) => encodeArgs(args),
    }),
  }),
});
