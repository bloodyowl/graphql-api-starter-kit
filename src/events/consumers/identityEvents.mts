import { deleteAllUserPets } from "#app/db/queries/deleteAllUserPets.mts";
import { MessageHandling, type Message } from "#app/events/events.mts";
import { type EventContext } from "#app/utils/context.mts";
import { Future, Result } from "@swan-io/boxed";
import { match, P } from "ts-pattern";

export const identityEvents = (
  event: Message<"identityEvents">,
  context: EventContext,
) => {
  return match(event)
    .with(
      {
        message: {
          value: {
            event: P.select({
              $case: "identityDeleted",
            }),
          },
        },
      },
      ({ identityDeleted: { userId } }) =>
        deleteAllUserPets({ userId }, context.db).mapOk(
          () => MessageHandling.handled,
        ),
    )
    .otherwise(() => Future.value(Result.Ok(MessageHandling.ignored)));
};
