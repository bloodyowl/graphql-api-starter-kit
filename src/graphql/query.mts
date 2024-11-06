import { builder } from "#app/graphql/builder.mts";
import { PetRef, PetType } from "#app/graphql/objects/Pet.mts";
import { PetConnection } from "#app/graphql/objects/PetConnection.mts";
import { type PetArgs, pets } from "#app/graphql/queries/pets.mts";
import {
  decodeArgs,
  encodeArgs,
  type EncodedArgs,
} from "#app/utils/pagination.mts";

import { User } from "#app/graphql/objects/User.mts";
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
    pets: t
      .withAuth({
        user: true,
      })
      .loadable({
        subGraphs: ["internal"], // Only on internal subgraph
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
    user: t.field({
      subGraphs: [], // Don't publish, this is only for testing purposes
      type: User,
      args: {
        id: t.arg({ type: "ID", required: true }),
      },
      resolve: (_, args) => ({ id: args.id }),
    }),
    viewer: t.withAuth({ user: true }).field({
      subGraphs: [], // Don't publish, this is only for testing purposes
      type: User,
      resolve: (_, args, context) => ({ id: context.auth.userId }),
    }),
  }),
});
