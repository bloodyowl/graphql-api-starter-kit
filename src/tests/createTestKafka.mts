import { type Kafka } from "#app/events/events.mts";
import { type Topics } from "#app/events/topics.mts";
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
      const subscribersForTopic = subscribers.get(topic) ?? new Set();
      subscribers.set(topic, subscribersForTopic);
      subscribersForTopic.add(func);
    },
    receive: message => {
      const subscribersForTopic = subscribers.get(message.topic) ?? new Set();
      const funcs = [...subscribersForTopic];
      return Future.all(funcs.map(func => func(message, context)));
    },
    emitted: () => emitted,
  };

  return kafka;
};
