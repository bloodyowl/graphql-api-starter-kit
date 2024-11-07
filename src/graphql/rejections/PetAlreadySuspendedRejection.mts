import { builder, RejectionInterface } from "#app/graphql/builder.mts";
import { Rejection } from "#app/graphql/rejections/Rejection.mts";

export class PetAlreadySuspendedRejection extends Rejection {
  name = "PetAlreadySuspendedRejection" as const;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, PetAlreadySuspendedRejection.prototype);
  }
}

builder.objectType(PetAlreadySuspendedRejection, {
  name: "PetAlreadySuspendedRejection",
  interfaces: [RejectionInterface],
});
