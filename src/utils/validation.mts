import { Future, type Result } from "@swan-io/boxed";
import { type ZodError, type ZodType } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validate = <T, Schema extends ZodType<any, any, any>>(
  value: T,
  schema: Schema,
) => {
  return Future.fromPromise(schema.parseAsync(value)).mapError(
    error => error as ZodError,
  ) as Future<
    Result<
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Schema extends ZodType<infer Output, infer _0, infer _1> ? Output : never,
      ZodError
    >
  >;
};
