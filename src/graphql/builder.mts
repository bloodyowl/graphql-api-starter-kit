import SchemaBuilder from "@pothos/core";
import DataloaderPlugin from "@pothos/plugin-dataloader";
import DirectivePlugin from "@pothos/plugin-directives";
import ErrorsPlugin from "@pothos/plugin-errors";
import FederationPlugin, { hasResolvableKey } from "@pothos/plugin-federation";
import RelayPlugin from "@pothos/plugin-relay";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import SubGraphPlugin from "@pothos/plugin-sub-graph";

import { type Future, type Result } from "@swan-io/boxed";

import { env } from "#app/env.mts";
import { CannotRegisterPetRejection } from "#app/graphql/rejections/CannotRegisterPetRejection.mts";
import { NotFoundRejection } from "#app/graphql/rejections/NotFoundRejection.mts";
import { Rejection } from "#app/graphql/rejections/Rejection.mts";
import { UnauthorizedRejection } from "#app/graphql/rejections/UnauthorizedRejection.mts";
import { type SubGraph } from "#app/graphql/subGraphs.mts";
import {
  type Auth,
  type ProjectAuth,
  type ProjectMemberAuth,
  type UserAuth,
} from "#app/utils/auth.mts";
import { type RequestContext } from "#app/utils/context.mts";
import { type DatabaseError } from "#app/utils/errors.mts";
import { ZodError, type ZodFormattedError } from "zod";

export const builder = new SchemaBuilder<{
  Context: RequestContext;
  Scalars: {
    ID: {
      Input: string;
      Output: string;
    };
  };
  Connection: {
    totalCount: { get: () => Future<Result<number, DatabaseError>> };
  };
  SubGraphs: SubGraph;
  AuthScopes: {
    authenticated: boolean;
    user: boolean;
    project: boolean;
    projectMember: boolean;
  };
  AuthContexts: {
    authenticated: RequestContext & { auth: Auth };
    user: RequestContext & { auth: UserAuth };
    project: RequestContext & { auth: ProjectAuth };
    projectMember: RequestContext & { auth: ProjectMemberAuth };
  };
}>({
  plugins: [
    RelayPlugin,
    ErrorsPlugin,
    ScopeAuthPlugin,
    DataloaderPlugin,
    DirectivePlugin,
    FederationPlugin,
    SubGraphPlugin,
  ],
  relay: {
    nodeQueryOptions: false,
    nodesQueryOptions: false,
    edgesFieldOptions: {
      nullable: {
        // @ts-expect-error Typed as `true`
        list: false,
        // @ts-expect-error Typed as `true`
        items: false,
      },
    },
    nodeFieldOptions: {
      nullable: false,
    },
  },
  errors: {
    defaultTypes: [Error, ZodError],
    defaultResultOptions: {
      name: ({ fieldName }) => `${fieldName}SuccessPayload`,
    },
    defaultUnionOptions: {
      name: ({ fieldName }) => `${fieldName}Payload`,
    },
  },
  subGraphs: {
    defaultForTypes: ["internal", "partner"],
    fieldsInheritFromTypes: true,
    explicitlyIncludeType: type => hasResolvableKey(type),
  },
  scopeAuth: {
    treatErrorsAsUnauthorized: true,
    unauthorizedError: () => new UnauthorizedRejection("Unauthorized"),
    authScopes: context => {
      const auth = context.auth;
      return {
        authenticated: auth != undefined,
        user: auth?.type === "User",
        project: auth?.type === "Project",
        projectMember: auth?.type === "ProjectMember",
      };
    },
  },
});

builder.globalConnectionFields(t => ({
  totalCount: t.int({
    nullable: false,
    resolve: parent => parent.totalCount.get().resultToPromise(),
  }),
}));

export const RejectionInterface = builder.interfaceType(Rejection, {
  name: "Rejection",
  fields: t => ({
    message: t.exposeString("message", { nullable: false }),
  }),
});

builder.objectType(Error, {
  name: "InternalErrorRejection",
  interfaces: [RejectionInterface],
  fields: t => ({
    message: t.string({
      nullable: false,
      resolve: t => {
        if (env.NODE_ENV === "development") {
          return t.message;
        }
        return "Unexpected Error";
      },
    }),
  }),
});

const flattenErrors = (
  error: ZodFormattedError<unknown>,
  path: string[],
): { path: string[]; message: string }[] => {
  const errors = error._errors.map(message => ({
    path,
    message,
  }));

  Object.keys(error).forEach(key => {
    if (key !== "_errors") {
      errors.push(
        ...flattenErrors(
          (error as Record<string, unknown>)[key] as ZodFormattedError<unknown>,
          [...path, key],
        ),
      );
    }
  });

  return errors;
};

const ValidationFieldError = builder
  .objectRef<{
    message: string;
    path: string[];
  }>("ValidationFieldError")
  .implement({
    fields: t => ({
      message: t.exposeString("message"),
      path: t.exposeStringList("path"),
    }),
  });

builder.objectType(ZodError, {
  name: "ValidationRejection",
  interfaces: [RejectionInterface],
  fields: t => ({
    message: t.string({
      nullable: false,
      resolve: () => "Validation rejection",
    }),
    fields: t.field({
      type: [ValidationFieldError],
      resolve: err => flattenErrors(err.format(), []),
    }),
  }),
});

builder.objectType(UnauthorizedRejection, {
  name: "UnauthorizedRejection",
  interfaces: [RejectionInterface],
});

builder.objectType(CannotRegisterPetRejection, {
  name: "CannotRegisterPetRejection",
  interfaces: [RejectionInterface],
});

builder.objectType(NotFoundRejection, {
  name: "NotFoundRejection",
  interfaces: [RejectionInterface],
});