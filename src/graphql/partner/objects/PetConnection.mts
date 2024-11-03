import { builder } from "#app/graphql/partner/builder.mts";
import { PetRef } from "#app/graphql/partner/objects/Pet.mts";

export const PetConnection = builder.connectionObject({
  type: PetRef,
  name: "PetConnection",
});
