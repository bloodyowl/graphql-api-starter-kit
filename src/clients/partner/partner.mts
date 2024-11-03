import { Future, Option, Result } from "@swan-io/boxed";
import { initGraphQLTada, type TadaDocumentNode } from "gql.tada";

import { env } from "#app/env.mts";
import {
  BadStatusError,
  InvalidGraphQLResponseError,
  parseGraphQLError,
} from "#app/utils/errors.mts";
import type { introspection } from "#types/graphql/clients-partner-env.d.ts";
import DataLoader from "dataloader";
import { type GraphQLError, print } from "graphql";
import { match, P } from "ts-pattern";

export const graphql = initGraphQLTada<{
  introspection: introspection;
}>();

export type PartnerClient = {
  run: <Data, Variables>(
    document: TadaDocumentNode<Data, Variables>,
    variables: Variables,
  ) => Future<
    Result<Data, BadStatusError | InvalidGraphQLResponseError | GraphQLError[]>
  >;
};

export const createPartnerClient = (authorization?: string) => {
  const dataLoaders: Map<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TadaDocumentNode<any, any>,
    DataLoader<string, unknown>
  > = new Map();

  return {
    run: <Data, Variables>(
      document: TadaDocumentNode<Data, Variables>,
      variables: Variables,
    ) => {
      let dataLoader = dataLoaders.get(document);
      if (dataLoader == undefined) {
        dataLoader = new DataLoader(variables => {
          return Future.all(
            variables.map(vars => {
              return Future.fromPromise(
                fetch(env.PARTNER_API_URL, {
                  method: "POST",
                  body: JSON.stringify({
                    query: print(document),
                    variables: JSON.parse(vars),
                  }),
                  headers: {
                    ...(authorization != undefined
                      ? { Authorization: authorization }
                      : {}),
                  },
                }),
              )
                .mapOkToResult(response => {
                  return Option.fromPredicate(
                    response,
                    response => response.ok,
                  ).toResult(new BadStatusError(response.status));
                })
                .flatMapOk(response => Future.fromPromise(response.json()))
                .mapError(() => new InvalidGraphQLResponseError("Invalid JSON"))
                .mapOk(payload =>
                  match(payload)
                    .with(
                      { data: Result.P.Ok({ errors: P.select(P.array()) }) },
                      errors => Result.Error(errors.map(parseGraphQLError)),
                    )
                    .with(
                      { data: Result.P.Ok({ data: P.select(P.nonNullable) }) },
                      data => Result.Ok(data as Data),
                    )
                    .otherwise(() =>
                      Result.Error(
                        new InvalidGraphQLResponseError(String(payload)),
                      ),
                    ),
                );
            }),
          ).toPromise();
        });
        dataLoaders.set(document, dataLoader);
      }

      const typedDataloader = dataLoader as DataLoader<
        string,
        Result<
          Data,
          BadStatusError | InvalidGraphQLResponseError | GraphQLError[]
        >
      >;

      return Future.fromPromise(typedDataloader.load(JSON.stringify(variables)))
        .mapOkToResult(x => x)
        .mapError(
          error =>
            error as
              | BadStatusError
              | InvalidGraphQLResponseError
              | GraphQLError[],
        );
    },
  };
};
