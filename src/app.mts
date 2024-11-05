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
import { schema, subGraphsSchemas } from "#app/graphql/schema.mts";
import { loggerAsyncLocalStorage } from "#app/utils/asyncLocalStorage.mts";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginInlineTrace } from "@apollo/server/plugin/inlineTrace";
import {
  fastifyApolloDrainPlugin,
  fastifyApolloHandler,
  type ApolloFastifyContextFunction,
} from "@as-integrations/fastify";
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

  if (env.NODE_ENV === "development") {
    const testingApi = new ApolloServer<RequestContext>({
      schema: schema,
      plugins: [
        fastifyApolloDrainPlugin(app),
        ApolloServerPluginInlineTrace({
          includeErrors: { transform: err => err },
        }),
      ],
    });

    await testingApi.start();

    const getContext: ApolloFastifyContextFunction<
      RequestContext
    > = async request => {
      return request.context;
    };

    const handler = fastifyApolloHandler(testingApi, {
      context: getContext,
    });

    app.route({
      url: "/graphql",
      method: ["GET", "POST", "OPTIONS"],
      handler: (request, reply) => {
        return loggerAsyncLocalStorage.run(request.log, () => {
          // @ts-expect-error Generics don't match
          return handler.call(app, request, reply);
        });
      },
    });
  }

  await Promise.all(
    subGraphsSchemas.map(async ({ pathname, schema }) => {
      const api = new ApolloServer<RequestContext>({
        schema,
        plugins: [
          fastifyApolloDrainPlugin(app),
          ApolloServerPluginInlineTrace({
            includeErrors: { transform: err => err },
          }),
        ],
      });

      await api.start();

      const getContext: ApolloFastifyContextFunction<
        RequestContext
      > = async request => {
        return request.context;
      };

      const handler = fastifyApolloHandler(api, {
        context: getContext,
      });

      app.route({
        url: pathname,
        method: ["GET", "POST", "OPTIONS"],
        handler: (request, reply) => {
          return loggerAsyncLocalStorage.run(request.log, () => {
            // @ts-expect-error Generics don't match
            return handler.call(app, request, reply);
          });
        },
      });
    }),
  );

  kafka.subscribe("identityEvents", identityEvents);

  return { app, kafka };
};
