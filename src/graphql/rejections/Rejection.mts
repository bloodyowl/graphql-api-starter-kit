export class Rejection extends Error {
  name = "Rejection";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, Rejection.prototype);
  }
}
