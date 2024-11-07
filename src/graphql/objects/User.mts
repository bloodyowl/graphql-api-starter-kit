import { builder } from "#app/graphql/builder.mts";
import { PetTypeEnum } from "#app/graphql/objects/Pet.mts";
import { userPets, type UserPetArgs } from "#app/graphql/queries/userPets.mts";
import {
  decodeArgs,
  encodeArgs,
  type EncodedArgs,
} from "#app/utils/pagination.mts";
import { Future, Result } from "@swan-io/boxed";
import { PetConnection } from "./PetConnection.mts";

export const User = builder.externalRef(
  "User",
  builder.selection<{ id: string }>("id"),
);

User.implement({
  subGraphs: ["partner"],
  // Requirements on external object
  externalFields: t => ({
    id: t.id({ nullable: false }),
  }),
});

builder.objectField(User, "pets", t =>
  t.withAuth({ $any: { project: true, user: true } }).loadable({
    type: PetConnection,
    nullable: false,
    args: {
      ...t.arg.connectionArgs(),
      types: t.arg({ type: [PetTypeEnum] }),
    },
    load: async (argsValues: EncodedArgs<UserPetArgs>[], context) =>
      Future.all(argsValues.map(args => userPets(decodeArgs(args), context)))
        .map(Result.all)
        .resultToPromise(),
    resolve: (parent, args) => encodeArgs({ ...args, userId: parent.id }),
  }),
);
