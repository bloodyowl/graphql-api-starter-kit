import { env } from "#app/env.mts";
import {
  handled,
  type Kafka,
  type Message,
  MessageHandling,
} from "#app/events/events.mts";
import { type Topics } from "#app/events/topics.mts";
import { loggerAsyncLocalStorage } from "#app/utils/asyncLocalStorage.mts";
import { type EventContext } from "#app/utils/context.mts";
import { KafkaError } from "#app/utils/errors.mts";
import { Future, Result } from "@swan-io/boxed";
import {
  type EachMessageHandler,
  type EachMessagePayload,
  Kafka as KafkaClient,
} from "kafkajs";

export const createProdKafka = async (
  context: EventContext,
): Promise<Kafka> => {
  const kafka = new KafkaClient({
    brokers: env.KAFKA_BROKERS,
  });

  const consumer = kafka.consumer({
    groupId: env.KAFKA_CONSUMER_GROUP_ID,
  });

  const producer = kafka.producer();

  await Promise.all([(consumer.connect(), producer.connect())]);

  const subscribersByTopic = new Map();

  const eachMessage = async <Topic extends keyof Topics>(
    message: EachMessagePayload,
  ) => {
    const matchingSubscriber: (
      message: Message<Topic>,
      context: EventContext,
    ) => Future<Result<MessageHandling, unknown>> = subscribersByTopic.get(
      message.topic,
    );

    const logger = context.log.child(
      { eventTop: message.topic, eventId: message.message.key },
      {},
    );

    if (matchingSubscriber == undefined) {
      logger.info({}, "Event ignored");
      return Future.value(Result.Ok(MessageHandling.ignored)).resultToPromise();
    } else {
      return loggerAsyncLocalStorage.run(logger, () =>
        matchingSubscriber(message as unknown as Message<Topic>, context)
          .tapOk(handling => {
            if (handling === handled) {
              logger.info({}, "Event processed");
            } else {
              logger.info({}, "Event ignored");
            }
          })
          .tapError(error => {
            logger.error(error, "Error processing event");
          })
          .resultToPromise(),
      );
    }
  };

  await consumer.run({
    eachMessage: eachMessage as unknown as EachMessageHandler,
  });

  return {
    emit: message => {
      return Future.fromPromise(
        producer.send({
          ...message,
          messages: message.messages.map(message => ({
            ...message,
            // TODO: encoding logic
            value: message.value as unknown as Buffer,
          })),
        }),
      )
        .mapError(error => new KafkaError(error))
        .tapError(error => {
          const logger = loggerAsyncLocalStorage.getStore();
          if (logger != undefined) {
            logger.error(error, "Error emitting event");
          }
        });
    },
    subscribe: (topic, handler) => {
      subscribersByTopic.set(topic, handler);
      consumer.subscribe({ topic });
    },
  };
};
