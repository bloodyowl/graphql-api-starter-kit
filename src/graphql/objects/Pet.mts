import { getPetById } from "#app/db/getPetById.mts";
import { builder } from "#app/graphql/builder.mts";
import { type RequestContext } from "#app/utils/context.mts";
import { deriveUnion } from "#app/utils/types.mts";
import { type Pet as PetTable } from "#types/db/db.mts";
import { Future } from "@swan-io/boxed";
import { type Selectable } from "kysely";

type Pet = Selectable<PetTable>;

export type PetType = Pet["type"];

export const petTypes = deriveUnion<PetType>({
  Cat: true,
  Dog: true,
  Giraffe: true,
});

export const PetType = builder.enumType("PetType", {
  values: petTypes.array,
});

export const load = async (ids: string[], context: RequestContext) => {
  return await Future.all(
    ids.map(id =>
      getPetById({ id }, context.db)
        // We need to cast as `Pet` as DataLoader doesn't accept `null`
        .map(result => result.toOption().toNull() as Pet),
    ),
  );
};

export const PetRef = builder.loadableObject(builder.objectRef<Pet>("Pet"), {
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
