import { builder } from "#app/graphql/builder.mts";
import { deriveUnion } from "#app/utils/types.mts";
import { PetStatus } from "#types/db/db.mts";

export const petStatuses = deriveUnion<PetStatus>(PetStatus);

export class PetStatusInfo {
  status: PetStatus;
  constructor({ status }: { status: PetStatus }) {
    this.status = status;
  }
}

export class PetActiveStatusInfo extends PetStatusInfo {
  constructor({ status }: { status: "Active" }) {
    super({ status });
  }
}

export class PetSuspendedStatusInfo extends PetStatusInfo {
  suspensionReason: string | null;
  constructor({
    status,
    suspensionReason,
  }: {
    status: "Suspended";
    suspensionReason: string | null;
  }) {
    super({ status });
    this.suspensionReason = suspensionReason;
  }
}

export const PetStatusEnum = builder.enumType("PetStatus", {
  values: petStatuses.array,
});

export const PetStatusInfoInterface = builder.interfaceType(PetStatusInfo, {
  name: "PetStatusInfo",
  fields: t => ({
    status: t.expose("status", {
      type: PetStatusEnum,
      nullable: false,
    }),
  }),
});

builder.objectType(PetActiveStatusInfo, {
  name: "PetActiveStatusInfo",
  interfaces: [PetStatusInfoInterface],
  isTypeOf: value => value instanceof PetActiveStatusInfo,
});

builder.objectType(PetSuspendedStatusInfo, {
  name: "PetSuspendedStatusInfo",
  interfaces: [PetStatusInfoInterface],
  isTypeOf: value => value instanceof PetSuspendedStatusInfo,
  fields: t => ({
    suspensionReasion: t.exposeString("suspensionReason", { nullable: true }),
  }),
});
