import { getPetById } from "#app/db/getPetById.mts";
import { builder } from "#app/graphql/builder.mts";
import { type RequestContext } from "#app/utils/context.mts";
import { DatabaseParseError } from "#app/utils/errors.mts";
import { deriveUnion } from "#app/utils/types.mts";
import { Future, Option } from "@swan-io/boxed";
import { isMatching, P } from "ts-pattern";

export type PetType = "Cat" | "Dog" | "Giraffe";

export const petTypes = deriveUnion<PetType>({
  Cat: true,
  Dog: true,
  Giraffe: true,
});

const petSchema = {
  id: P.string,
  type: petTypes.P,
  ownerId: P.string,
  description: P.union(P.string, P.nullish),
  createdAt: P.instanceOf(Date),
  updatedAt: P.instanceOf(Date),
};

export type Pet = P.infer<typeof petSchema>;

export const fromDb = <T,>(pet: T) => {
  return Option.fromPredicate(pet, isMatching(petSchema)).toResult(
    new DatabaseParseError(),
  );
};

export const PetType = builder.enumType("PetType", {
  values: petTypes.array,
});

export const Pet = builder.objectRef<Pet>("Pet");

export const load = async (ids: string[], context: RequestContext) => {
  return await Future.all(
    ids.map(id =>
      getPetById({ id }, context.db)
        // We need to cast as `Pet` as DataLoader doesn't accept `null`
        .map(result => result.toOption().toNull() as Pet),
    ),
  );
};

export const PetRef = builder.loadableObject(Pet, {
  load,
  fields: t => ({
    id: t.exposeID("id", { nullable: false }),
    type: t.expose("type", { type: PetType, nullable: false }),
    ownerId: t.exposeID("ownerId", {
      nullable: false,
      subGraphs: ["internal"],
    }),
    description: t.exposeString("description"),
  }),
});
