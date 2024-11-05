import { type Db } from "#app/utils/context.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import { Future } from "@swan-io/boxed";

type Input = {
  userId: string;
};

export const deleteAllUserPets = ({ userId }: Input, db: Db) => {
  const createdAt = new Date().toISOString();

  return Future.fromPromise(
    db.transaction().execute(async trx => {
      const pets = await trx
        .deleteFrom("Pet")
        .where("ownerId", "=", userId)
        .returning("id")
        .execute();

      await Promise.all(
        pets.map(({ id }) => {
          const eventId = crypto.randomUUID();
          return trx
            .insertInto("Outbox")
            .values({
              id: eventId,
              aggregateType: "pet",
              aggregateId: id,
              createdAt,
              updatedAt: createdAt,
              type: "PetDeleted",
              acknowledged: true,
              payload: "",
            })
            .execute();
        }),
      );
    }),
  ).mapError(err => new DatabaseError(err));
};
