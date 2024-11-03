import jwt from "jsonwebtoken";

const defaultUserId = crypto.randomUUID();
const defaultProjectId = crypto.randomUUID();
const defaultOauthClientId: `SANDBOX_${string}` | `LIVE_${string}` =
  `SANDBOX_${crypto.randomUUID()}`;
const defaultOauthScopes = ["offline"];

export const createUserToken = ({
  userId = defaultUserId,
  projectId = defaultProjectId,
  oauthClientId = defaultOauthClientId,
  oauthScopes = defaultOauthScopes,
}) => {
  return jwt.sign(
    {
      context: {
        type: "User",
        user: { id: userId },
        project: { id: projectId },
        oauth: {
          clientId: oauthClientId,
          scopes: oauthScopes,
        },
      },
    },
    "secret",
  );
};

export const createProjectToken = ({
  projectId = defaultProjectId,
  oauthClientId = defaultOauthClientId,
  oauthScopes = defaultOauthScopes,
}) => {
  return jwt.sign(
    {
      context: {
        type: "Project",
        project: { id: projectId },
        oauth: {
          clientId: oauthClientId,
          scopes: oauthScopes,
        },
      },
    },
    "secret",
  );
};

export const createProjectMemberToken = ({
  userId = defaultUserId,
  projectId = defaultProjectId,
  oauthClientId = defaultOauthClientId,
  oauthScopes = defaultOauthScopes,
}) => {
  return jwt.sign(
    {
      context: {
        type: "ProjectMember",
        user: { id: userId },
        project: { id: projectId },
        oauth: {
          clientId: oauthClientId,
          scopes: oauthScopes,
        },
      },
    },
    "secret",
  );
};
