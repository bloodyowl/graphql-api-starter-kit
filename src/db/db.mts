import { type DB } from "#app/db/types.mts";
import { env } from "#app/env.mts";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: env.DATABASE_URL,
    min: 5,
    max: 20,
  }),
});

export const db = new Kysely<DB>({
  dialect,
  log: env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
});
