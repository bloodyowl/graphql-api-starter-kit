# api-starter-kit

This is a starter kit for a GraphQL server to be federated using Apollo.

## Installation

```console
$ yarn
$ yarn configure-hooks
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

You can then open `https://localhost:3000/graphql` and try the explorer.

You can preview all the subgraphs you expose (e.g. `https://localhost:3000/partner-graphql`, `https://localhost:3000/internal-graphql`).

If you need a token to simulate authentication, you can use the `get-test-token` command:

```console
$ yarn get-test-token user
$ yarn get-test-token project
$ yarn get-test-token project-member
```

## Run tests

```console
$ yarn test
```

## [Docs](./docs/)
