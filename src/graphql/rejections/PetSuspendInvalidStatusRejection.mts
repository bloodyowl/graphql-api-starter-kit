import { builder, RejectionInterface } from "#app/graphql/builder.mts";
import { Rejection } from "#app/graphql/rejections/Rejection.mts";

export class PetSuspendInvalidStatusRejection extends Rejection {
  name = "PetSuspendInvalidStatusRejection" as const;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, PetSuspendInvalidStatusRejection.prototype);
  }
}

builder.objectType(PetSuspendInvalidStatusRejection, {
  name: "PetSuspendInvalidStatusRejection",
  interfaces: [RejectionInterface],
});
