import { start } from "#app/app.mts";
import { type Kafka } from "#app/events/events.mts";
import { type ClientsContext } from "#app/utils/context.mts";
import {
  BadStatusError,
  InvalidGraphQLResponseError,
  parseGraphQLError,
} from "#app/utils/errors.mts";
import { type DB } from "#types/db/db.mts";

import type { introspection } from "#types/graphql/schema-env.d.ts";

import { createTranslationHelper, type Translator } from "#app/i18n/i18n.mts";
import { Future, Result } from "@swan-io/boxed";
import { initGraphQLTada, type TadaDocumentNode } from "gql.tada";
import { type GraphQLError, print } from "graphql";
import { type Kysely } from "kysely";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { newDb } from "pg-mem";
import { match, P } from "ts-pattern";
import { createTestKafka, type TestKafka } from "./createTestKafka.mts";

export const partnerGraphql = initGraphQLTada<{
  introspection: introspection;
}>();

export class FastifyError extends Error {
  name = "FastifyError";
  constructor(cause: unknown) {
    super("FastifyError");
    Object.setPrototypeOf(this, FastifyError.prototype);
    this.cause = cause;
  }
}

const migration = fs.readFileSync(
  path.join(process.cwd(), "prisma/generated.sql"),
  "utf8",
);

export const testWithApp = (
  name: string,
  func: (config: {
    t: Translator;
    db: Kysely<DB>;
    kafka: Kafka & TestKafka;
    clientsContext: Partial<ClientsContext>;
    partner: {
      graphql: typeof partnerGraphql;
      run: <Data, Variables>(
        document: TadaDocumentNode<Data, Variables>,
        variables: Variables,
        token?: string | undefined,
      ) => Promise<Data>;
    };
  }) => Promise<void>,
) => {
  test(name, async () => {
    const mock = newDb();
    mock.public.none(migration);

    const db = mock.adapters.createKysely() as Kysely<DB>;

    const clientsContext: Partial<ClientsContext> = {};

    const { app, kafka } = await start(
      {
        db,
        getKafka: createTestKafka,
      },
      clientsContext,
    );

    const t = createTranslationHelper("en");

    await func({
      db,
      clientsContext,
      kafka,
      t,
      partner: {
        graphql: partnerGraphql,
        run: <Data, Variables>(
          document: TadaDocumentNode<Data, Variables>,
          variables: Variables,
          token?: string | undefined,
        ) => {
          return Future.fromPromise(
            app.inject({
              method: "POST",
              url: "/graphql",
              payload: JSON.stringify({
                query: print(document),
                variables,
              }),
              headers: {
                "content-type": "application/json",
                accept: "application/json",
                ...(token != undefined
                  ? {
                      authorization: `Bearer ${token}`,
                    }
                  : {}),
              },
            }),
          )
            .mapError(error => new FastifyError(error))
            .mapOkToResult(response => {
              const data = Result.fromExecution<unknown, unknown>(() =>
                JSON.parse(response.body),
              );
              return match({
                statusCode: response.statusCode,
                data,
              })
                .returnType<
                  Result<
                    Data,
                    | BadStatusError
                    | InvalidGraphQLResponseError
                    | Array<GraphQLError>
                  >
                >()
                .with({ statusCode: P.not(200) }, () =>
                  Result.Error(new BadStatusError(response.statusCode)),
                )
                .with(
                  { data: Result.P.Ok({ errors: P.select(P.array()) }) },
                  errors => Result.Error(errors.map(parseGraphQLError)),
                )
                .with(
                  { data: Result.P.Ok({ data: P.select(P.nonNullable) }) },
                  data => Result.Ok(data as Data),
                )
                .otherwise(() =>
                  Result.Error(new InvalidGraphQLResponseError(response.body)),
                );
            })
            .resultToPromise();
        },
      },
    });

    await app.close();
    await db.destroy();
  });
};

export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  assert(value != null);
}

export function assertIsTrue(value: boolean): asserts value is true {
  assert(value === true);
}

export function assertIsFalse(value: boolean): asserts value is false {
  assert(value === false);
}

export function assertIsNotDefined<T>(
  value: T,
): asserts value is T & (null | undefined) {
  assert(value == null);
}

export function assertEqual<T, E extends T>(
  value: T,
  expected: E,
): asserts value is E {
  assert.equal(value, expected);
}

export function assertDeepEqual<T, E extends T>(
  value: T,
  expected: E,
): asserts value is E {
  assert.deepEqual(value, expected);
}
