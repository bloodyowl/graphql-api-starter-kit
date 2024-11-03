import { Rejection } from "#app/graphql/rejections/Rejection.mts";

export class CannotRegisterPetRejection extends Rejection {
  name = "CannotRegisterPetRejection" as const;
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, CannotRegisterPetRejection.prototype);
  }
}
