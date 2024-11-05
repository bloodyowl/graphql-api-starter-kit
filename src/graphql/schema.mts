import { builder } from "#app/graphql/builder.mts";

import "#app/graphql/mutation.mts";
import "#app/graphql/query.mts";

import { subGraphs } from "#app/graphql/subGraphs.mts";
import { printSubgraphSchema } from "@apollo/subgraph";
import { Dict } from "@swan-io/boxed";
import { printSchema } from "graphql";
import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const format = (schema: string) => {
  return prettier.format(schema, { parser: "graphql" });
};

const PREFIX = `# This is a generated file, don't edit\n\n`;

export const schema = builder.toSchema();

fs.writeFileSync(
  path.join(import.meta.dirname, "schemas/schema.gql"),
  await format(PREFIX + printSchema(schema)),
  "utf-8",
);

export const subGraphsSchemas = await Promise.all(
  Dict.entries(subGraphs).map(async ([key, { pathname }]) => {
    const schema = builder.toSubGraphSchema({
      linkUrl: "https://specs.apollo.dev/federation/v2.4",
      subGraph: key,
    });

    fs.writeFileSync(
      path.join(import.meta.dirname, `schemas/${key}.gql`),
      await format(PREFIX + printSubgraphSchema(schema)),
      "utf-8",
    );
    return { pathname, schema };
  }),
);
