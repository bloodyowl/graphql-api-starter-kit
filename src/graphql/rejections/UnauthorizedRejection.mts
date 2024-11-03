import { Rejection } from "#app/graphql/rejections/Rejection.mts";

export class UnauthorizedRejection extends Rejection {
  name = "UnauthorizedRejection" as const;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UnauthorizedRejection.prototype);
  }
}
