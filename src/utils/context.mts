import { type PartnerClient } from "#app/clients/partner/partner.mts";
import { type filterAccountMembership } from "#app/clients/partner/queries/filterAccountMembership.mts";
import { type Kafka } from "#app/events/events.mts";
import { type FeatureFlags } from "#app/utils/featureFlags.mts";
import { type DB } from "#types/db/db.mts";
import {
  type FastifyBaseLogger,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { type Kysely } from "kysely";
import { type Auth } from "./auth.mts";

export type Db = Kysely<DB>;

export type GlobalContext = {
  db: Db;
  kafka: Kafka;
};

export type ClientsContext = {
  filterAccountMembership: typeof filterAccountMembership;
};

export type RequestContext = GlobalContext &
  ClientsContext & {
    auth: Auth | undefined;
    request: FastifyRequest;
    reply: FastifyReply;
    log: FastifyBaseLogger;
    featureFlags: FeatureFlags;
    partnerClient: PartnerClient;
  };

export type AuthenticatedRequestContext<AllowedAuth = Auth> = RequestContext & {
  auth: AllowedAuth;
};

export type EventContext = GlobalContext &
  ClientsContext & {
    log: FastifyBaseLogger;
    featureFlags: FeatureFlags;
    partnerClient: PartnerClient;
  };
