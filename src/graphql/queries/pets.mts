import { countPets, getPetsConnection } from "#app/db/getPetsConnection.mts";
import { PetRef, petTypes, type PetType } from "#app/graphql/objects/Pet.mts";
import { type UserAuth } from "#app/utils/auth.mts";
import { type AuthenticatedRequestContext } from "#app/utils/context.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import { getCursorForOrderBy } from "#app/utils/pagination.mts";
import {
  resolveCursorConnection,
  type DefaultConnectionArguments,
  type ResolveCursorConnectionArgs,
} from "@pothos/plugin-relay";
import { Future, Lazy } from "@swan-io/boxed";

export type PetArgs = DefaultConnectionArguments & {
  types?: PetType[] | undefined | null;
};

export const pets = (
  args: PetArgs,
  context: AuthenticatedRequestContext<UserAuth>,
) => {
  const types = args.types ?? petTypes.array;
  const userId = context.auth.userId;

  context.log.info(`pets (${types})`);

  return Future.fromPromise(
    resolveCursorConnection(
      {
        args: args,
        toCursor: node =>
          getCursorForOrderBy(node, "createdAt", x => x.toISOString()),
      },
      (connectionArgs: ResolveCursorConnectionArgs) => {
        return getPetsConnection(
          {
            ...connectionArgs,
            types,
            userId,
            orderBy: "createdAt",
          },
          context.db,
        )
          .tapOk(pets => {
            pets.forEach(pet => {
              PetRef.getDataloader(context).prime(pet.id, pet);
            });
          })
          .resultToPromise();
      },
    ),
  )
    .mapError(err => new DatabaseError(err))
    .mapOk(connection => ({
      ...connection,
      totalCount: Lazy(() => countPets({ types, userId }, context.db)),
    }))
    .tapError(error => context.log.warn(error, error.message));
};
