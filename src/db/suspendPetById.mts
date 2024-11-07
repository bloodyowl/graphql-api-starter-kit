import { type Db } from "#app/utils/context.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import { Future } from "@swan-io/boxed";

type Input = {
  id: string;
  suspensionReason: string | undefined;
};

export const suspendPetById = ({ id, suspensionReason }: Input, db: Db) => {
  const updatedAt = new Date().toISOString();

  return Future.fromPromise(
    db
      .updateTable("Pet")
      .set({
        status: "Suspended",
        suspensionReason,
        updatedAt,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow(),
  ).mapError(err => new DatabaseError(err));
};
