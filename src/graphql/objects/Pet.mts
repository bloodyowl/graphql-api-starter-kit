import { getPetById } from "#app/db/getPetById.mts";
import { builder } from "#app/graphql/builder.mts";
import {
  PetActiveStatusInfo,
  PetStatusInfoInterface,
  PetSuspendedStatusInfo,
} from "#app/graphql/objects/PetStatusInfo.mts";
import { type RequestContext } from "#app/utils/context.mts";
import { deriveUnion } from "#app/utils/types.mts";
import { type Pet as PetTable, PetType } from "#types/db/db.mts";
import { Future } from "@swan-io/boxed";
import { type Selectable } from "kysely";
import { match } from "ts-pattern";

type Pet = Selectable<PetTable>;

export { type PetType };

export const petTypes = deriveUnion<PetType>(PetType);

export const PetTypeEnum = builder.enumType("PetType", {
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
    type: t.expose("type", { type: PetTypeEnum, nullable: false }),
    ownerId: t.exposeID("ownerId", {
      nullable: false,
      shareable: true,
      subGraphs: ["partner", "internal"],
    }),
    description: t.exposeString("description"),
    statusInfo: t.field({
      type: PetStatusInfoInterface,
      nullable: false,
      resolve: parent =>
        match(parent)
          .with(
            { status: "Active" },
            ({ status }) => new PetActiveStatusInfo({ status }),
          )
          .with(
            { status: "Suspended" },
            ({ status, suspensionReason }) =>
              new PetSuspendedStatusInfo({ status, suspensionReason }),
          )
          .exhaustive(),
    }),
  }),
});

builder.asEntity(PetRef, {
  key: builder.selection<{ id: string }>("id"),
  resolveReference: (user, context) =>
    PetRef.getDataloader(context).load(user.id),
});
