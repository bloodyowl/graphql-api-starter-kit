import { Dict } from "@swan-io/boxed";

type Props<T extends { id: string }> = {
  ids: Array<string>;
  rows: Array<T>;
};

export const sqlResultToDataLoaded = <T extends { id: string }>({
  ids,
  rows,
}: Props<T>) => {
  const rowsById = Dict.fromEntries(rows.map(item => [item.id, item]));
  // DataLoader doesn't allow `null` in its types, but it's fine
  return ids.map(id => (rowsById[id] ?? null) as T);
};
