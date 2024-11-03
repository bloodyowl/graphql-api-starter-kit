import {
  buildClientSchema,
  getIntrospectionQuery,
  type IntrospectionQuery,
  printSchema,
} from "graphql";
import fs from "node:fs";
import path from "node:path";
import { url, validate } from "valienv";

const introspectionQuery = getIntrospectionQuery({
  inputValueDeprecation: true,
});

const env = validate({
  env: process.env,
  validators: {
    PARTNER_API_URL: url,
  },
});

const nameAndUrl = [{ name: "partner-schema", url: env.PARTNER_API_URL }];

nameAndUrl.forEach(({ name, url }) => {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: introspectionQuery }),
  })
    .then(res => res.json())
    .then(res => res as { data: IntrospectionQuery })
    .then(res => buildClientSchema(res.data))
    .then(res => printSchema(res))
    .then(schema => {
      fs.writeFileSync(
        path.join(import.meta.dirname, `dist/${name}.gql`),
        schema,
        "utf-8",
      );
    })
    .catch(err => {
      console.error(name, err);
      process.exit(1);
    });
});
