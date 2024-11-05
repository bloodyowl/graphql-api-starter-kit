import { fromDb } from "#app/graphql/objects/Pet.mts";
import { type Db } from "#app/utils/context.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import { Future } from "@swan-io/boxed";

type Input = {
  id: string;
};

export const getPetById = ({ id }: Input, db: Db) => {
  return Future.fromPromise(
    db
      .selectFrom("Pet")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow(),
  )
    .mapError(err => new DatabaseError(err))
    .mapOkToResult(fromDb);
};
