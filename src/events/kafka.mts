import { env } from "#app/env.mts";
import {
  type Kafka,
  type Message,
  MessageHandling,
} from "#app/events/events.mts";
import { type Topics } from "#app/events/topics.mts";
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
    if (matchingSubscriber == undefined) {
      return Future.value(Result.Ok(MessageHandling.ignored)).resultToPromise();
    } else {
      return matchingSubscriber(
        message as unknown as Message<Topic>,
        context,
      ).resultToPromise();
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
      ).mapError(error => new KafkaError(error));
    },
    subscribe: (topic, handler) => {
      subscribersByTopic.set(topic, handler);
      consumer.subscribe({ topic });
    },
  };
};
