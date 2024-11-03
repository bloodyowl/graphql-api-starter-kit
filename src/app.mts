import { createPartnerClient } from "#app/clients/partner/partner.mts";
import { filterAccountMembership } from "#app/clients/partner/queries/filterAccountMembership.mts";
import { env } from "#app/env.mts";
import { getAuth } from "#app/utils/auth.mts";
import {
  type ClientsContext,
  type Db,
  type EventContext,
  type RequestContext,
} from "#app/utils/context.mts";
import { createFeaturesFlags } from "#app/utils/featureFlags.mts";

import { identityEvents } from "#app/events/consumers/identityEvents.mts";
import { type Kafka } from "#app/events/events.mts";
import { partnerSchema } from "#app/graphql/partner/schema.mts";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTrace } from "@apollo/server/plugin/inlineTrace";
import {
  fastifyApolloDrainPlugin,
  fastifyApolloHandler,
  type ApolloFastifyContextFunction,
} from "@as-integrations/fastify";
import fastifyCors from "@fastify/cors";
import { randomUUID } from "crypto";
import fastify from "fastify";
import { match, P } from "ts-pattern";
import packageJson from "../package.json" with { type: "json" };

declare module "fastify" {
  export interface FastifyRequest {
    context: RequestContext;
  }
}

export const start = async <K extends Kafka>(
  {
    db,
    getKafka,
  }: {
    db: Db;
    getKafka: (context: EventContext) => Promise<K>;
  },
  clientsContext?: Partial<ClientsContext>,
) => {
  const app = fastify({
    trustProxy: true,
    bodyLimit: 2_097_152, // 2MBs
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === "development" && {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
        formatters: {
          level(label) {
            return { level: label };
          },
        },
      }),
    },
    genReqId: req => {
      const existingRequestId = req.headers["x-swan-request-id"];
      if (typeof existingRequestId === "string") {
        return existingRequestId;
      }
      return `req-${randomUUID()}`;
    },
  });

  await app.register(fastifyCors, {
    credentials: true,
    preflightContinue: true,
  });

  const eventContext: EventContext = {
    db,
    get kafka() {
      return kafka;
    },
    log: app.log,
    featureFlags: createFeaturesFlags({}),
    partnerClient: createPartnerClient(),

    // client context
    filterAccountMembership,
    ...clientsContext,
  };

  const kafka = await getKafka(eventContext);

  await app.addHook("onRequest", async (request, reply) => {
    const auth = getAuth(request);
    request.context = {
      // Global
      db,
      kafka,
      // Request
      auth,
      request,
      reply,
      log: request.log,
      partnerClient: createPartnerClient(auth?.authorization),
      featureFlags: createFeaturesFlags({
        userId: match(auth)
          .with({ userId: P.select(P.string) }, userId => userId)
          .otherwise(() => null),
        projectId: match(auth)
          .with({ projectId: P.select(P.string) }, projectId => projectId)
          .otherwise(() => null),
        ip: request.ip,
      }),

      // client context
      filterAccountMembership,
      ...clientsContext,
    };
  });

  app.get("/health", async (request, reply) => {
    return reply.send({
      version: packageJson.version,
      date: new Date(),
      status: "ok",
    });
  });

  const partnerApi = new ApolloServer<RequestContext>({
    schema: partnerSchema,
    plugins: [
      fastifyApolloDrainPlugin(app),
      ApolloServerPluginInlineTrace({
        includeErrors: { transform: err => err },
      }),
    ],
  });

  await partnerApi.start();

  const getContext: ApolloFastifyContextFunction<
    RequestContext
  > = async request => {
    return request.context;
  };

  app.route({
    url: "/partner",
    method: ["GET", "POST", "OPTIONS"],
    handler: fastifyApolloHandler(partnerApi, {
      context: getContext,
    }),
  });

  kafka.subscribe("identityEvents", identityEvents);

  return { app, kafka };
};
