import { start } from "#app/app.mts";
import { db } from "#app/db/db.mts";
import { env } from "#app/env.mts";
import { createTestKafka } from "#app/tests/createTestKafka.mts";
import { createProdKafka } from "./events/kafka.mts";

const getKafka =
  // Use the mock in local dev
  env.NODE_ENV === "production" ? createProdKafka : createTestKafka;

const { app } = await start({
  db,
  getKafka,
});

await app.listen({
  port: env.PORT,
});
