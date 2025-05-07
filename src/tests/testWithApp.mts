import { start } from "#app/app.mts";
import { type Kafka } from "#app/events/events.mts";
import {
  BadStatusError,
  InvalidGraphQLResponseError,
  parseGraphQLError,
} from "#app/utils/errors.mts";
import { type DB } from "#types/db/db.mts";

import type { introspection } from "#types/graphql/schema-env.d.ts";

import { createTranslationHelper, type Translator } from "#app/i18n/i18n.mts";
import { PGlite } from "@electric-sql/pglite";
import { Future, Result } from "@swan-io/boxed";
import { initGraphQLTada, type TadaDocumentNode } from "gql.tada";
import { type GraphQLError, print } from "graphql";
import { Kysely } from "kysely";
import { PGliteDialect } from "kysely-pglite-dialect";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
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

export const testWithApp = (
  name: string,
  func: (config: {
    t: Translator;
    db: Kysely<DB>;
    kafka: Kafka & TestKafka;
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
    const pglite = new PGlite({
      loadDataDir: new Blob([
        fs.readFileSync(path.join(process.cwd(), "src/tests/databases/pglite")),
      ]),
    });

    const db = new Kysely<DB>({
      dialect: new PGliteDialect(pglite),
    });

    const { app, kafka } = await start({
      db,
      getKafka: createTestKafka,
    });

    const t = createTranslationHelper("en");

    await func({
      db,
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
