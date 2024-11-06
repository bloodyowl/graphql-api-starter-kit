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
import { useGraphQlJit } from "@envelop/graphql-jit";
import { createYoga, type YogaLogger } from "graphql-yoga";

import { identityEvents } from "#app/events/consumers/identityEvents.mts";
import { type Kafka } from "#app/events/events.mts";
import { schema, subGraphsSchemas } from "#app/graphql/schema.mts";
import { createTranslationHelper, getLocale } from "#app/i18n/i18n.mts";
import { loggerAsyncLocalStorage } from "#app/utils/asyncLocalStorage.mts";
import fastifyCors from "@fastify/cors";
import { Option } from "@swan-io/boxed";
import { randomUUID } from "crypto";
import fastify, { type FastifyRequest } from "fastify";
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
        serializers: {
          req(request: FastifyRequest) {
            return {
              method: request.method,
              url: request.url,
              auth: Option.fromNullable(getAuth(request))
                .map(
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  ({ authorization, ...rest }) => rest,
                )
                .toNull(),
            };
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
    t: createTranslationHelper("en"),

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
      t: createTranslationHelper(getLocale(request.headers["accept-language"])),
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

  const logging: YogaLogger = {
    debug: (...args) => {
      const log = loggerAsyncLocalStorage.getStore() ?? app.log;
      args.forEach(arg => log.debug(arg));
    },
    info: (...args) => {
      const log = loggerAsyncLocalStorage.getStore() ?? app.log;
      args.forEach(arg => log.info(arg));
    },
    warn: (...args) => {
      const log = loggerAsyncLocalStorage.getStore() ?? app.log;
      args.forEach(arg => log.warn(arg));
    },
    error: (...args) => {
      const log = loggerAsyncLocalStorage.getStore() ?? app.log;
      args.forEach(arg => log.error(arg));
    },
  };

  if (env.NODE_ENV === "development") {
    const localApi = createYoga<RequestContext>({
      schema,
      graphqlEndpoint: "/graphql",
      logging,
      plugins: [useGraphQlJit()],
    });

    app.route({
      url: localApi.graphqlEndpoint,
      method: ["GET", "POST", "OPTIONS"],
      handler: async (request, reply) => {
        return loggerAsyncLocalStorage.run(request.log, async () => {
          const response = await localApi.handleNodeRequestAndResponse(
            request,
            reply,
            request.context,
          );
          response.headers.forEach((value, key) => {
            reply.header(key, value);
          });
          reply.status(response.status);
          reply.send(response.body);
          return reply;
        });
      },
    });
  }

  subGraphsSchemas.forEach(({ pathname, schema }) => {
    const api = createYoga<RequestContext>({
      schema,
      graphqlEndpoint: pathname,
      logging,
      plugins: [useGraphQlJit()],
    });

    app.route({
      url: api.graphqlEndpoint,
      method: ["GET", "POST", "OPTIONS"],
      handler: async (request, reply) => {
        return loggerAsyncLocalStorage.run(request.log, async () => {
          const response = await api.handleNodeRequestAndResponse(
            request,
            reply,
            request.context,
          );
          response.headers.forEach((value, key) => {
            reply.header(key, value);
          });
          reply.status(response.status);
          reply.send(response.body);
          return reply;
        });
      },
    });
  });

  kafka.subscribe("identityEvents", identityEvents);

  return { app, kafka };
};
