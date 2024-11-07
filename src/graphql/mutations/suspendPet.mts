import { getPetById } from "#app/db/getPetById.mts";
import { suspendPetById } from "#app/db/suspendPetById.mts";
import { builder } from "#app/graphql/builder.mts";
import { PetAlreadySuspendedRejection } from "#app/graphql/rejections/PetAlreadySuspendedRejection.mts";
import { UnauthorizedRejection } from "#app/graphql/rejections/UnauthorizedRejection.mts";
import { type UserAuth } from "#app/utils/auth.mts";
import { type AuthenticatedRequestContext } from "#app/utils/context.mts";
import { validate } from "#app/utils/validation.mts";
import { Future, Option, Result } from "@swan-io/boxed";
import { match, P } from "ts-pattern";
import { z } from "zod";

export const SuspendPetInput = builder.inputType("SuspendPetInput", {
  fields: t => ({
    id: t.id({ required: true }),
    suspensionReason: t.string({ required: false }),
  }),
});

type Input = typeof SuspendPetInput.$inferInput;

const supendPetInputSchema = z.object({
  suspensionReason: z.optional(z.string().min(2).max(100)),
});

export const suspendPet = (
  input: Input,
  context: AuthenticatedRequestContext<UserAuth>,
) => {
  const id = input.id;

  context.log.info(`suspendPet (${id})`);

  const suspendablePet = getUserPetById(input.id, context).mapOkToResult(pet =>
    match(pet)
      .with({ status: P.not("Suspended") }, pet => Result.Ok(pet))
      .otherwise(() =>
        Result.Error(
          new PetAlreadySuspendedRejection(
            context.t("rejection.PetAlreadySuspendedRejection"),
          ),
        ),
      ),
  );

  return Future.allFromDict({
    input: validate(input, supendPetInputSchema),
    suspendablePet,
  })
    .map(Result.allFromDict)
    .flatMapOk(({ input: { suspensionReason }, suspendablePet: { id } }) =>
      suspendPetById({ id, suspensionReason }, context.db),
    )
    .tapOk(() => context.log.info(`suspendPet success (${id})`))
    .tapError(error => context.log.warn(error, error.message));
};

const getUserPetById = (
  id: string,
  context: AuthenticatedRequestContext<UserAuth>,
) =>
  getPetById({ id }, context.db).mapOkToResult(pet =>
    Option.fromPredicate(
      pet,
      pet => pet.ownerId === context.auth.userId,
    ).toResult(
      new UnauthorizedRejection(context.t("rejection.UnauthorizedRejection")),
    ),
  );
