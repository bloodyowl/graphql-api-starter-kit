import { builder } from "#app/graphql/builder.mts";
import { PetRef } from "#app/graphql/objects/PetRef.mts";

export const PetConnection = builder.connectionObject({
  type: PetRef,
  name: "PetConnection",
});
