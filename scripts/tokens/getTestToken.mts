import {
  createProjectMemberToken,
  createProjectToken,
  createUserToken,
} from "#app/tests/testTokens.mts";
import type { UUID } from "crypto";
import { match, P } from "ts-pattern";

const args = process.argv;

const USER_ID = "--user-id=";
const PROJECT_ID = "--project-id=";

const getArguments = (values: Array<string>) => {
  return values.reduce<{ userId?: UUID; projectId?: UUID }>(
    (acc, value) => {
      if (value.startsWith(USER_ID)) {
        return {
          ...acc,
          userId: value.slice(USER_ID.length) as UUID,
        };
      }
      if (value.startsWith(PROJECT_ID)) {
        return {
          ...acc,
          projectId: value.slice(PROJECT_ID.length) as UUID,
        };
      }
      return acc;
    },
    { userId: crypto.randomUUID(), projectId: crypto.randomUUID() },
  );
};

match(args.slice(2))
  .with(["user", ...P.array(P.select(P.string))], args => {
    const values = getArguments(args);
    console.log({
      ...values,
      token: createUserToken(values),
    });
  })
  .with(["project", ...P.array(P.select(P.string))], args => {
    const values = getArguments(args);
    console.log({
      ...values,
      token: createProjectToken(values),
    });
  })
  .with(["project-member", ...P.array(P.select(P.string))], args => {
    const values = getArguments(args);
    console.log({
      ...values,
      token: createProjectMemberToken(values),
    });
  })
  .otherwise(() => {
    console.log(`get-test-token

Usage:
yarn get-test-token user
yarn get-test-token project
yarn get-test-token project-member

Optional arguments:
--user-id=XXX
--project-id=XXX
`);
  });
