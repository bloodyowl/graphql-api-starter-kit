import { builder } from "#app/graphql/partner/builder.mts";
import { PetType } from "#app/graphql/partner/objects/Pet.mts";
import { PetConnection } from "#app/graphql/partner/objects/PetConnection.mts";
import {
  type UserPetArgs,
  userPets,
} from "#app/graphql/partner/queries/userPets.mts";
import {
  decodeArgs,
  encodeArgs,
  type EncodedArgs,
} from "#app/utils/pagination.mts";
import { Future, Result } from "@swan-io/boxed";

const UserRef = builder.externalRef(
  "User",
  builder.selection<{ id: string }>("id"),
);

UserRef.implement({
  // Requirements on external object
  externalFields: t => ({
    id: t.id({ nullable: false }),
  }),
  fields: t => ({
    pets: t.loadable({
      type: PetConnection,
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
  }),
});
