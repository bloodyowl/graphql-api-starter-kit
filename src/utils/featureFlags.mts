import { env } from "#app/env.mts";
import { Future, Lazy, Option } from "@swan-io/boxed";
import { TgglClient, type TgglContext, type TgglFlags } from "tggl-client";

export type FeatureFlags = {
  get: <T extends keyof TgglFlags>(
    key: T,
    defaultValue: TgglFlags[T],
  ) => Future<TgglFlags[T]>;
  refineContext: (context: Partial<TgglContext>) => FeatureFlags;
};

export const createFeaturesFlags = (
  initialContext: Partial<TgglContext>,
): FeatureFlags => {
  const lazyClient = Lazy(() => {
    return Future.make<TgglClient>(resolve => {
      const client = new TgglClient(env.TGGL_API_KEY);
      client.setContext(initialContext).finally(() => resolve(client));
    });
  });

  return {
    get: (flag, defaultValue) => {
      return lazyClient.get().map(client => {
        return Option.fromNullable(client.get(flag)).getOr(defaultValue);
      });
    },
    refineContext: context =>
      createFeaturesFlags({ ...initialContext, ...context }),
  };
};

export const createTestFeaturesFlags = (
  flagMap: Partial<TgglFlags>,
): FeatureFlags => {
  return {
    get: (flag, defaultValue) => {
      return Future.value(
        Option.fromNullable(flagMap[flag]).getOr(defaultValue),
      );
    },
    refineContext: () => createTestFeaturesFlags(flagMap),
  };
};
