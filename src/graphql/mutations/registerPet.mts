import { createPet } from "#app/db/createPet.mts";
import { builder } from "#app/graphql/builder.mts";
import { PetType, petTypes } from "#app/graphql/objects/Pet.mts";
import { PetCounter } from "#app/metrics/PetCounter.mts";
import { type UserAuth } from "#app/utils/auth.mts";
import { type AuthenticatedRequestContext } from "#app/utils/context.mts";
import { type GetInput } from "#app/utils/types.mts";
import { validate } from "#app/utils/validation.mts";
import { z } from "zod";

export const RegisterPetInput = builder.inputType("RegisterPetInput", {
  fields: t => ({
    type: t.field({
      type: PetType,
      required: true,
    }),
  }),
});

type Input = GetInput<typeof RegisterPetInput>;

const registerPetInputSchema = z.object({
  type: z.enum(petTypes.array).exclude(["Giraffe"]),
});

export const registerPet = (
  input: Input,
  context: AuthenticatedRequestContext<UserAuth>,
) => {
  const userId = context.auth.userId;

  const id = crypto.randomUUID();

  context.log.info(`registerPet (${id})`);

  return validate(input, registerPetInputSchema).flatMapOk(({ type }) =>
    createPet({ id, type, userId }, context.db)
      .tapOk(({ type }) => PetCounter.inc({ type }))
      .tapOk(() => context.log.info(`registerPet success (${id})`))
      .tapError(error => context.log.warn(error, error.message)),
  );
};
