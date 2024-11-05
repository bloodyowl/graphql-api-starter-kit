import { fromDb, type PetType } from "#app/graphql/objects/Pet.mts";
import { type Db } from "#app/utils/context.mts";
import { DatabaseError } from "#app/utils/errors.mts";
import { Future } from "@swan-io/boxed";

type Input = {
  id: string;
  type: PetType;
  userId: string;
};

export const createPet = ({ id, type, userId }: Input, db: Db) => {
  const createdAt = new Date().toISOString();

  return Future.fromPromise(
    db.transaction().execute(async trx => {
      const pet = trx
        .insertInto("Pet")
        .values({ id, type, ownerId: userId, createdAt, updatedAt: createdAt })
        .returningAll()
        .executeTakeFirst();

      const eventId = crypto.randomUUID();
      const outbox = trx
        .insertInto("Outbox")
        .values({
          id: eventId,
          aggregateType: "pet",
          aggregateId: id,
          createdAt,
          updatedAt: createdAt,
          type: "PetCreated",
          acknowledged: true,
          payload: "",
        })
        .execute();

      await Promise.all([pet, outbox]);

      return pet;
    }),
  )
    .mapError(err => new DatabaseError(err))
    .mapOkToResult(fromDb);
};
