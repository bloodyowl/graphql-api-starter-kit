import { type Db } from "#app/utils/context.mts";
import { sqlResultToDataLoaded } from "#app/utils/dataLoader.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import { Future } from "@swan-io/boxed";

type Input = {
  ids: Array<string>;
};

export const getPetsByIds = ({ ids }: Input, db: Db) => {
  return Future.fromPromise(
    db.selectFrom("Pet").selectAll().where("id", "in", ids).execute(),
  )
    .mapOk(rows => sqlResultToDataLoaded({ ids, rows }))
    .mapError(err => new DatabaseError(err));
};
