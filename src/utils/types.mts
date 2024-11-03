import { Dict } from "@swan-io/boxed";
import { P } from "ts-pattern";

type UnionToIntersection<U> = (
  U extends never ? never : (arg: U) => never
) extends (arg: infer I) => void
  ? I
  : never;

type UnionToTuple<T> =
  UnionToIntersection<T extends never ? never : (t: T) => T> extends (
    _: never,
  ) => infer W
    ? [...UnionToTuple<Exclude<T, W>>, W]
    : [];

export const deriveUnion = <T extends PropertyKey>(object: Record<T, true>) => {
  const array = Dict.keys(object) as UnionToTuple<T>;
  const set = new Set(array);
  const is = (value: unknown): value is T => set.has(value as T);
  const keyMirror = Dict.fromEntries(array.map(x => [x, x])) as unknown as {
    [K in T]: K;
  };
  return { keyMirror, array, set, is, P: P.when(is) };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GetInput<T extends PothosSchemaTypes.InputObjectRef<any, any>> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends PothosSchemaTypes.InputObjectRef<any, infer V> ? V : never;
