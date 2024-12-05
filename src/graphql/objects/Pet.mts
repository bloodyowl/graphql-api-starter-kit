import { getPetsByIds } from "#app/db/getPetsByIds.mts";
import { builder } from "#app/graphql/builder.mts";
import { PetRef } from "#app/graphql/objects/PetRef.mts";
import {
  PetActiveStatusInfo,
  PetStatusInfoInterface,
  PetSuspendedStatusInfo,
} from "#app/graphql/objects/PetStatusInfo.mts";
import { User } from "#app/graphql/objects/User.mts";
import { type RequestContext } from "#app/utils/context.mts";
import { deriveUnion } from "#app/utils/types.mts";
import { type Pet as PetTable, PetType } from "#types/db/db.mts";
import { type Selectable } from "kysely";
import { match } from "ts-pattern";

type Pet = Selectable<PetTable>;

export { type PetType };

export const petTypes = deriveUnion<PetType>(PetType);

export const PetTypeEnum = builder.enumType("PetType", {
  values: petTypes.array,
});

export const load = (ids: Array<string>, context: RequestContext) => {
  return getPetsByIds({ ids }, context.db).resultToPromise();
};

export const Pet = builder.loadableObject(PetRef, {
  load,
  fields: t => ({
    id: t.exposeID("id", { nullable: false }),
    type: t.expose("type", { type: PetTypeEnum, nullable: false }),
    ownerId: t.exposeID("ownerId", {
      nullable: false,
      shareable: true,
      subGraphs: ["partner", "internal"],
    }),
    owner: t.field({
      type: User,
      nullable: false,
      resolve: parent => ({ id: parent.id }),
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
  resolveReference: (user, context) => Pet.getDataloader(context).load(user.id),
});
