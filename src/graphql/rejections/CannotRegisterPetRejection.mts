import { builder, RejectionInterface } from "#app/graphql/builder.mts";
import { Rejection } from "#app/graphql/rejections/Rejection.mts";

export class CannotRegisterPetRejection extends Rejection {
  name = "CannotRegisterPetRejection" as const;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CannotRegisterPetRejection.prototype);
  }
}

builder.objectType(CannotRegisterPetRejection, {
  name: "CannotRegisterPetRejection",
  interfaces: [RejectionInterface],
});
