import { builder, RejectionInterface } from "#app/graphql/builder.mts";
import { Rejection } from "#app/graphql/rejections/Rejection.mts";

export class NotFoundRejection extends Rejection {
  name = "NotFoundRejection" as const;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NotFoundRejection.prototype);
  }
}

builder.objectType(NotFoundRejection, {
  name: "NotFoundRejection",
  interfaces: [RejectionInterface],
});
