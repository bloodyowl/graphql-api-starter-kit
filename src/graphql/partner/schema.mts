import { builder } from "#app/graphql/partner/builder.mts";

import "#app/graphql/partner/mutation.mts";
import "#app/graphql/partner/query.mts";

import "#app/graphql/partner/objects/User.mts";

import { env } from "#app/env.mts";

import { printSchema } from "graphql";
import fs from "node:fs";
import path from "node:path";

export const partnerSchema = builder.toSubGraphSchema({});

if (env.NODE_ENV !== "test") {
  fs.writeFileSync(
    path.join(import.meta.dirname, "partner.gql"),
    printSchema(partnerSchema),
    "utf-8",
  );
}
