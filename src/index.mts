import { start } from "#app/app.mts";
import { env } from "#app/env.mts";
import { createProdKafka } from "#app/events/kafka.mts";
import { createTestKafka } from "#app/tests/createTestKafka.mts";
import { loggerAsyncLocalStorage } from "#app/utils/asyncLocalStorage.mts";
import { type DB } from "#types/db/db.mts";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

const getKafka =
  // Use the mock in local dev
  env.NODE_ENV === "production" ? createProdKafka : createTestKafka;

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: env.DATABASE_URL,
    min: 5,
    max: 20,
  }),
});

const db = new Kysely<DB>({
  dialect,
  log: event => {
    const log = loggerAsyncLocalStorage.getStore();
    if (log != undefined) {
      if (event.level === "error") {
        log.error(
          {
            sql: event.query.sql,
            error: event.error,
            duration: event.queryDurationMillis,
          },
          "SQL query errored",
        );
      }
      if (event.level === "query") {
        log.info(
          { sql: event.query.sql, duration: event.queryDurationMillis },
          "SQL query succeeded",
        );
      }
    }
  },
});

const { app } = await start({
  db,
  getKafka,
});

await app.listen({
  port: env.PORT,
});
