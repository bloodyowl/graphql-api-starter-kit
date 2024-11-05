import { builder } from "#app/graphql/builder.mts";
import {
  decodeArgs,
  encodeArgs,
  type EncodedArgs,
} from "#app/utils/pagination.mts";
import { Future, Result } from "@swan-io/boxed";
import { userPets, type UserPetArgs } from "../queries/userPets.mts";
import { PetType } from "./Pet.mts";
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
  t.withAuth({ project: true }).loadable({
    type: PetConnection,
    nullable: false,
    args: {
      ...t.arg.connectionArgs(),
      types: t.arg({ type: [PetType] }),
    },
    load: async (argsValues: EncodedArgs<UserPetArgs>[], context) =>
      Future.all(argsValues.map(args => userPets(decodeArgs(args), context)))
        .map(Result.all)
        .resultToPromise(),
    resolve: (parent, args) => encodeArgs({ ...args, userId: parent.id }),
  }),
);
