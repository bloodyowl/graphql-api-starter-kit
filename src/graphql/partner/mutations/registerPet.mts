import { createPet } from "#app/db/queries/createPet.mts";
import { builder } from "#app/graphql/partner/builder.mts";
import { PetType, petTypes } from "#app/graphql/partner/objects/Pet.mts";
import { PetCounter } from "#app/metrics/PetCounter.mts";
import { filterAuth } from "#app/utils/auth.mts";
import { type RequestContext } from "#app/utils/context.mts";
import { type GetInput } from "#app/utils/types.mts";
import { validate } from "#app/utils/validation.mts";
import { Future, Result } from "@swan-io/boxed";
import { z } from "zod";

export const RegisterPetInput = builder.inputType("RegisterPetInput", {
  fields: t => ({
    type: t.field({
      type: PetType,
      required: true,
    }),
  }),
});

export const inputSchema = z.object({
  type: z.enum([petTypes.keyMirror.Cat, petTypes.keyMirror.Dog]),
});

type Input = GetInput<typeof RegisterPetInput>;

export const registerPet = (rawInput: Input, context: RequestContext) => {
  const auth = filterAuth(context.auth, { type: "User" });
  const input = validate(rawInput, inputSchema);

  return Future.allFromDict({ auth, input })
    .map(Result.allFromDict)
    .flatMapOk(({ auth: { userId }, input: { type } }) => {
      const id = crypto.randomUUID();

      context.log.info(`registerPet (${id})`);

      return createPet({ id, type, userId }, context.db)
        .tapOk(({ type }) => PetCounter.inc({ type }))
        .tapOk(() => context.log.info(`registerPet success (${id})`))
        .tapError(error => context.log.warn(error, error.message));
    });
};
