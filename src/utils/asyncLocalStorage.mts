import { AsyncLocalStorage } from "async_hooks";
import { type FastifyBaseLogger } from "fastify";

export const loggerAsyncLocalStorage =
  new AsyncLocalStorage<FastifyBaseLogger>();
