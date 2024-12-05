import { type PetType } from "#app/graphql/objects/Pet.mts";
import { type Db } from "#app/utils/context.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import {
  extractCursorForOrderBy,
  toWhereClause,
} from "#app/utils/pagination.mts";
import { type ResolveCursorConnectionArgs } from "@pothos/plugin-relay";
import { Future } from "@swan-io/boxed";

type Filters = {
  types: Array<PetType>;
  userId: string;
};

type Input = ResolveCursorConnectionArgs &
  Filters & {
    orderBy: "createdAt";
  };

export const getPetsConnection = (
  { before, after, limit, inverted, types, orderBy, userId }: Input,
  db: Db,
) => {
  const cursor = extractCursorForOrderBy(
    { before, after },
    field => new Date(field),
  ).toUndefined();

  let query = db
    .selectFrom("Pet")
    .selectAll()
    .where("ownerId", "=", userId)
    .where("type", "in", types);

  const whereOrderBy = toWhereClause({
    fieldName: orderBy,
    ...cursor?.field,
  });
  const whereId = toWhereClause({
    fieldName: "id",
    ...cursor?.id,
  });

  if (whereOrderBy.isSome()) {
    query = query.where(...whereOrderBy.get());
  }

  if (whereId.isSome()) {
    query = query.where(...whereId.get());
  }

  return Future.fromPromise(
    query
      .limit(limit)
      .orderBy(orderBy, inverted ? "desc" : "asc")
      .orderBy("id", inverted ? "desc" : "asc")
      .execute(),
  ).mapError(err => new DatabaseError(err));
};

export const countPets = ({ types, userId }: Filters, db: Db) => {
  return Future.fromPromise(
    db
      .selectFrom("Pet")
      .select(({ fn }) =>
        fn
          .countAll()
          .filterWhere("type", "in", types)
          .filterWhere("ownerId", "=", userId)
          .as("count"),
      )
      .executeTakeFirstOrThrow(),
  )
    .mapError(err => new DatabaseError(err))
    .mapOk(({ count }) => Number(count));
};
