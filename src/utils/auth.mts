import { type FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { match, P } from "ts-pattern";

type Env = "Sandbox" | "Live";

export type UserAuth = {
  type: "User";
  env: Env;
  userId: string;
  projectId: string;
  oauthClientId: string;
  oauthScopes: string[];
  authorization: string;
};

export type ProjectAuth = {
  type: "Project";
  env: Env;
  projectId: string;
  oauthClientId: string;
  oauthScopes: string[];
  authorization: string;
};

export type ProjectMemberAuth = {
  type: "ProjectMember";
  env: Env;
  userId: string;
  projectId: string;
  oauthClientId: string;
  oauthScopes: string[];
  authorization: string;
};

export type Auth = UserAuth | ProjectAuth | ProjectMemberAuth;

const BEARER_PREFIX = "Bearer ";

export const getAuth = (request: FastifyRequest) => {
  const authorization = request.headers.authorization;
  if (authorization == undefined) {
    return;
  }
  if (!authorization.startsWith(BEARER_PREFIX)) {
    return;
  }
  const token = authorization.slice(BEARER_PREFIX.length);
  const parsed = jwt.decode(token);
  return match(parsed)
    .returnType<Auth | undefined>()
    .with(
      {
        context: {
          type: P.select("type", "User"),
          user: {
            id: P.select("userId", P.string),
          },
          project: {
            id: P.select("projectId", P.string),
          },
          oauth: {
            clientId: P.select(
              "oauthClientId",
              P.union(
                P.string.startsWith("LIVE_"),
                P.string.startsWith("SANDBOX_"),
              ),
            ),
            scopes: P.select("oauthScopes", P.array(P.string)),
          },
        },
      },
      userToken => ({
        ...userToken,
        env: userToken.oauthClientId.startsWith("LIVE_") ? "Live" : "Sandbox",
        authorization,
      }),
    )
    .with(
      {
        context: {
          type: P.select("type", "Project"),
          project: {
            id: P.select("projectId", P.string),
          },
          oauth: {
            clientId: P.select(
              "oauthClientId",
              P.union(
                P.string.startsWith("LIVE_"),
                P.string.startsWith("SANDBOX_"),
              ),
            ),
            scopes: P.select("oauthScopes", P.array(P.string)),
          },
        },
      },
      projectToken => ({
        ...projectToken,
        env: projectToken.oauthClientId.startsWith("LIVE_")
          ? "Live"
          : "Sandbox",
        authorization,
      }),
    )
    .with(
      {
        context: {
          type: P.select("type", "ProjectMember"),
          user: {
            id: P.select("userId", P.string),
          },
          project: {
            id: P.select("projectId", P.string),
          },
          oauth: {
            clientId: P.select(
              "oauthClientId",
              P.union(
                P.string.startsWith("LIVE_"),
                P.string.startsWith("SANDBOX_"),
              ),
            ),
            scopes: P.select("oauthScopes", P.array(P.string)),
          },
        },
      },
      userToken => ({
        ...userToken,
        env: userToken.oauthClientId.startsWith("LIVE_") ? "Live" : "Sandbox",
        authorization,
      }),
    )
    .otherwise(() => undefined);
};
