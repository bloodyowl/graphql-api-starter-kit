import { type Db } from "#app/utils/context.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import type { Pet } from "#types/db/db.mts";
import { Future } from "@swan-io/boxed";
import type { Insertable } from "kysely";

type Input = Insertable<Pet>;

export const updatePet = (fields: Input, db: Db) => {
  const updatedAt = new Date().toISOString();

  return Future.fromPromise(
    db
      .updateTable("Pet")
      .set({ ...fields, updatedAt })
      .where("id", "=", fields.id)
      .returningAll()
      .executeTakeFirstOrThrow(),
  ).mapError(err => new DatabaseError(err));
};
