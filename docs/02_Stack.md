# Stack

This repository is a simple node.js app.

## Language

### Typing

TypeScript with `.mts` extension.

In order to give a quick feedback loop and avoid any compilation step, the app uses the `--experimental-strip-types` option from node.js.

To make this work, importing a type needs to be explicitely performed using `import type`.

```ts
import { type MyType } from "./module";
```

### Imports

In order to avoid importing with `../../..` paths, the app uses import aliases. It has the benefit of expliciting the namespace.

```ts
// #app refers to `./src`
import { app } from "#app/app.mts";
```

## Server

The server uses [Fastify](https://fastify.dev), which has the benefit of having a great TypeScript ecosystem.

## Database

We use PostgreSQL through [Kylesy](https://kysely.dev).

The schemas and migrations are generated using [Prisma](https://www.prisma.io) for convenience.

## GraphQL

### Schema

The app uses [Pothos](https://pothos-graphql.dev) as a schema builder.

It enables us to write the schema with expressive TypeScript code and handles a lot using its plugins system:

- Maps known error to rejections
- Dataloader out of the box (even for cursor-based connections!)
- Outputs federated schemas
- Handles Relay-compliant types
- Accepts Zod validation on inputs

Note you need to provide one subschema per schema you want to publish on (meaning one directory in `./src/graphql`).

### Server

We use [Apollo Server](https://www.apollographql.com/docs/apollo-server) to serve the GraphQL endpoints.

## Distributed events

The app uses [KafkaJS](https://kafka.js.org) to receive and emit events.
