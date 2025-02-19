import { type Kafka } from "#app/events/events.mts";
import { type Translator } from "#app/i18n/i18n.mts";
import { type Auth } from "#app/utils/auth.mts";
import { type FeatureFlags } from "#app/utils/featureFlags.mts";
import { type DB } from "#types/db/db.mts";
import {
  type FastifyBaseLogger,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { type Kysely } from "kysely";

export type Db = Kysely<DB>;

export type GlobalContext = {
  db: Db;
  kafka: Kafka;
};

export type RequestContext = GlobalContext & {
  auth: Auth | undefined;
  request: FastifyRequest;
  reply: FastifyReply;
  log: FastifyBaseLogger;
  featureFlags: FeatureFlags;
  t: Translator;
};

export type AuthenticatedRequestContext<AllowedAuth = Auth> = RequestContext & {
  auth: AllowedAuth;
};

export type EventContext = GlobalContext & {
  log: FastifyBaseLogger;
  featureFlags: FeatureFlags;
  t: Translator;
};
