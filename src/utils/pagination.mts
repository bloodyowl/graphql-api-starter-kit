import { Option } from "@swan-io/boxed";
import { match, P } from "ts-pattern";

const SEPARATOR = "::";

export const getCursorForOrderBy = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Node extends { id: string } & Record<string, any>,
  T extends string,
>(
  node: Node,
  orderBy: T,
  mapper: (value: Node[T]) => string,
) => {
  return Buffer.from(`${mapper(node[orderBy])}${SEPARATOR}${node.id}`).toString(
    "base64",
  );
};

const parseCursor = (string: string) => {
  const cursor = Buffer.from(string, "base64").toString("utf-8");
  const parts = cursor.split(SEPARATOR);
  return match(parts)
    .with([P.string, P.string], ([orderByValue, idValue]) =>
      Option.Some({ orderByValue, idValue }),
    )
    .otherwise(() => Option.None());
};

export type Cursor<V> = {
  field: { before?: V; after?: V };
  id: { before?: string; after?: string };
};

export const extractCursorForOrderBy = <V,>(
  { before, after }: { before?: string; after?: string },
  mapper: (orderByValue: string) => V,
): Option<Cursor<V>> => {
  const afterCursor: Option<Cursor<V>> = Option.fromNullable(after)
    .flatMap(parseCursor)
    .map(({ orderByValue, idValue }) => ({
      field: { after: mapper(orderByValue) },
      id: { after: idValue },
    }));
  const beforeCursor: Option<Cursor<V>> = Option.fromNullable(before)
    .flatMap(parseCursor)
    .map(({ orderByValue, idValue }) => ({
      field: { before: mapper(orderByValue) },
      id: { before: idValue },
    }));
  return afterCursor.orElse(beforeCursor);
};

export const toWhereClause = <T extends string, V>({
  fieldName,
  before,
  after,
}: {
  fieldName: T;
  before?: V;
  after?: V;
}): Option<[T, "<" | ">", V]> => {
  if (before != undefined) {
    return Option.Some([fieldName, "<", before] as const);
  }
  if (after != undefined) {
    return Option.Some([fieldName, ">", after] as const);
  }
  return Option.None();
};

const symbol = Symbol("type");

export type EncodedArgs<T> = string & { [symbol]: T };

export const encodeArgs = <T,>(value: T) =>
  JSON.stringify(value) as EncodedArgs<T>;

export const decodeArgs = <T,>(value: EncodedArgs<T>) => JSON.parse(value) as T;
