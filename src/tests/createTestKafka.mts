import {
  handled,
  MessageHandling,
  type Kafka,
  type Message,
} from "#app/events/events.mts";
import { type Topics } from "#app/events/topics.mts";
import { loggerAsyncLocalStorage } from "#app/utils/asyncLocalStorage.mts";
import { type EventContext } from "#app/utils/context.mts";
import { Future, Result } from "@swan-io/boxed";
import { type IHeaders } from "kafkajs";

export type TestKafka = {
  emitted: () => {
    [Topic in keyof Topics]: {
      topic: Topic;
      messages: {
        key: string;
        value: Topics[Topic];
        partition?: number;
        headers?: IHeaders;
      }[];
    };
  }[keyof Topics][];
  receive: <Topic extends keyof Topics>(message: {
    topic: Topic;
    partition: number;
    message: {
      key: string;
      value: Topics[Topic];
      headers: IHeaders;
    };
  }) => Future<unknown>;
};

export const createTestKafka = async (context: EventContext) => {
  const emitted: {
    [Topic in keyof Topics]: {
      topic: Topic;
      messages: {
        key: string;
        value: Topics[Topic];
        partition?: number;
        headers?: IHeaders;
      }[];
    };
  }[keyof Topics][] = [];
  const subscribers = new Map();

  const kafka: Kafka & TestKafka = {
    emit: message => {
      emitted.push(
        message as {
          [Topic in keyof Topics]: {
            topic: Topic;
            messages: {
              key: string;
              value: Topics[Topic];
              partition?: number;
              headers?: IHeaders;
            }[];
          };
        }[keyof Topics][][number],
      );
      return Future.value(
        Result.Ok(
          message.messages.map(() => ({
            topicName: message.topic,
            partition: 0,
            errorCode: 0,
          })),
        ),
      );
    },
    subscribe: (topic, func) => {
      subscribers.set(topic, func);
    },
    receive: <Topic extends keyof Topics>(message: Message<Topic>) => {
      const logger = context.log.child(
        { eventTop: message.topic, eventId: message.message.key },
        {},
      );

      return loggerAsyncLocalStorage.run(logger, () => {
        const subscriberForTopic:
          | ((
              message: Message<Topic>,
              context: EventContext,
            ) => Future<Result<MessageHandling, unknown>>)
          | undefined = subscribers.get(message.topic);

        if (subscriberForTopic == undefined) {
          logger.info({}, "Event ignored");
          return Future.value(Result.Ok(MessageHandling.ignored));
        }

        return subscriberForTopic(message, {
          ...context,
          log: logger,
        })
          .tapOk(handling => {
            if (handling === handled) {
              logger.info({}, "Event processed");
            } else {
              logger.info({}, "Event ignored");
            }
          })
          .tapError(error => {
            logger.error(error, "Error processing event");
          });
      });
    },
    emitted: () => emitted,
  };

  return kafka;
};
