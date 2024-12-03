import { toSuspendedPet } from "#app/records/Pet.ts";
import { assertEqual } from "#app/tests/testWithApp.mts";
import test, { suite } from "node:test";

suite("Pet", () => {
  test("toSuspendedPet", () => {
    const suspensionReason = crypto.randomUUID();
    const suspended = toSuspendedPet(
      {
        id: crypto.randomUUID(),
        ownerId: crypto.randomUUID(),
        type: "Cat",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "Active",
        suspensionReason: null,
      },
      { suspensionReason },
    );

    // this assertion is a bit superfluous given the type guarantees it
    assertEqual(suspended.status, "Suspended");
    assertEqual(suspended.suspensionReason, suspensionReason);
  });
});
