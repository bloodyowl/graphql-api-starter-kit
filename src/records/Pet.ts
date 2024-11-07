import type { Pet } from "#types/db/db.mts";
import type { Selectable } from "kysely";

type T = Selectable<Pet>;
type Status = T["status"];

type WithStatus<S extends Status> = T & { status: S };

export const toSuspendedPet = (
  pet: WithStatus<"Active">,
  { suspensionReason }: { suspensionReason: string | null },
): WithStatus<"Suspended"> => ({
  ...pet,
  status: "Suspended",
  suspensionReason,
});
