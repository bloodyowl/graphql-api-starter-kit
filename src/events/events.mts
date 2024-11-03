import { type Topics } from "#app/events/topics.mts";
import { type EventContext } from "#app/utils/context.mts";
import { type KafkaError } from "#app/utils/errors.mts";
import { type Future, type Result } from "@swan-io/boxed";
import { type IHeaders, type RecordMetadata } from "kafkajs";

export const handled = Symbol("handled");
export const ignored = Symbol("ignored");

export type MessageHandling = typeof handled | typeof ignored;

export const MessageHandling: {
  handled: MessageHandling;
  ignored: MessageHandling;
} = {
  handled,
  ignored,
};

export type Message<Topic extends keyof Topics> = {
  topic: Topic;
  partition: number;
  message: {
    key: string;
    value: Topics[Topic];
    headers: IHeaders;
  };
};

export type Kafka = {
  subscribe: <Topic extends keyof Topics>(
    topic: Topic,
    func: (
      message: Message<Topic>,
      context: EventContext,
    ) => Future<Result<MessageHandling, unknown>>,
  ) => void;

  emit: <Topic extends keyof Topics>(message: {
    topic: Topic;
    messages: {
      key: string;
      value: Topics[Topic];
      partition?: number;
      headers?: IHeaders;
    }[];
  }) => Future<Result<RecordMetadata[], KafkaError>>;
};
