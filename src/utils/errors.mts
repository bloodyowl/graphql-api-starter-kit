import { type ASTNode, GraphQLError, type Source } from "graphql";
import { match, P } from "ts-pattern";

export class TechnicalError extends Error {
  name = "TechnicalError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, TechnicalError.prototype);
  }
}

export class DatabaseError extends Error {
  name = "DatabaseError";
  constructor(cause: unknown) {
    super("DatabaseError");
    Object.setPrototypeOf(this, DatabaseError.prototype);
    this.cause = cause;
  }
}

export class KafkaError extends Error {
  name = "KafkaError";
  constructor(cause: unknown) {
    super("KafkaError");
    Object.setPrototypeOf(this, KafkaError.prototype);
    this.cause = cause;
  }
}

export class DatabaseParseError extends Error {
  name = "DatabaseParseError";
  constructor() {
    super("DatabaseParseError");
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class BadStatusError extends Error {
  name = "BadStatusError";
  status: number;
  constructor(status: number) {
    super(`BadStatusError (${status})`);
    Object.setPrototypeOf(this, BadStatusError.prototype);
    this.status = status;
  }
}

export class InvalidGraphQLResponseError extends Error {
  name = "InvalidGraphQLResponseError";
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidGraphQLResponseError.prototype);
  }
}

export const parseGraphQLError = (error: unknown): GraphQLError => {
  return match(error)
    .with(
      {
        message: P.string,
        nodes: P.optional(P.any),
        source: P.optional(P.any),
        positions: P.optional(P.any),
        path: P.optional(P.any),
        error: P.optional(P.any),
        extensions: P.optional(P.any),
      },
      ({ message, nodes, source, positions, path, error, extensions }) => {
        const originalError = match(error)
          .with({ message: P.string }, ({ message }) => new Error(message))
          .otherwise(() => undefined);
        return new GraphQLError(message, {
          nodes: nodes as ReadonlyArray<ASTNode> | ASTNode | null | undefined,
          source: source as Source | null | undefined,
          positions: positions as readonly number[] | null | undefined,
          path: path as readonly (string | number)[] | null | undefined,
          originalError,
          extensions: extensions as
            | {
                [extension: string]: unknown;
              }
            | null
            | undefined,
        });
      },
    )
    .otherwise(error => new GraphQLError(JSON.stringify(error)));
};
