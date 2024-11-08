import { builder } from "#app/graphql/builder.mts";
import type { Pet as PetTable } from "#types/db/db.mts";
import type { Selectable } from "kysely";

type Pet = Selectable<PetTable>;

export const PetRef = builder.objectRef<Pet>("Pet");
