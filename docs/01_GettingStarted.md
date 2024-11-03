# Getting started

This is a starter kit for a GraphQL server to be federated using Apollo.

## Installation

```console
$ yarn
```

## Codegen

To update the database schemas, you can run the codegen command:

```console
$ yarn codegen
```

## Setup for local development

First, start the database in a terminal tab (you'll need [Docker](https://www.docker.com) on your machine):

```console
$ docker-compose up
```

Then, migrate the database to the current schema:

```console
$ yarn setup
```

<details>
	<summary>Reset local database</summary>

You can reset your local database using the following command (careful, this is destructive).

```console
$ yarn reset
```

</details>

## Start development server

```console
$ yarn dev
```

You can then open `https://localhost:3000/partner` and try the Apollo Explorer.

## Run tests

```console
$ yarn test
```

## Structure

- `prisma`: database schema
- `scripts`: build utils
- `src`:
  - `clients`: APIs the app consume
  - `db`: database queries
  - `events`: kafka event handlers
  - `graphql`:
    - `partner`: schema and resolvers for the exposed partner API
    - `rejections`: rejections that can be shared between schemas
  - `metrics`: `prom` utils
  - `tests`: test utilities
  - `utils`: utilities
