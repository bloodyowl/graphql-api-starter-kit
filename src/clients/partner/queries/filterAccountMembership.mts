import { type PartnerClient, graphql } from "#app/clients/partner/partner.mts";
import { UnauthorizedRejection } from "#app/graphql/rejections/UnauthorizedRejection.mts";
import { Option, Result } from "@swan-io/boxed";
import { match } from "ts-pattern";

const query = graphql(`
  query hasPermissionOnAccount($accountId: String!) {
    accountMemberships(filters: { accountId: $accountId }) {
      edges {
        node {
          id
          statusInfo {
            status
          }
          canManageCards
          canInitiatePayments
          canManageAccountMembership
          canManageBeneficiaries
          canViewAccount
        }
      }
    }
  }
`);

type AccountMembershipStatus = ReturnType<
  typeof graphql.scalar<"AccountMembershipStatus">
>;

type Permission =
  | "canManageCards"
  | "canInitiatePayments"
  | "canManageAccountMembership"
  | "canManageBeneficiaries"
  | "canViewAccount";

export const filterAccountMembership = <
  const RequiredPermissions extends Partial<Record<Permission, boolean>>,
  const AcceptedStatuses extends AccountMembershipStatus[],
>(
  client: PartnerClient,
  {
    accountId,
    permissions,
    statuses,
  }: {
    accountId: string;
    permissions: RequiredPermissions;
    statuses: AcceptedStatuses;
  },
) => {
  return client
    .run(query, { accountId })
    .mapOkToResult(data =>
      Option.fromNullable(data.accountMemberships.edges.at(0))
        .map(edge => edge.node)
        .toResult(new UnauthorizedRejection("Unauthorized")),
    )
    .mapOkToResult(accountMembership => {
      return match(accountMembership)
        .with(
          {
            canViewAccount: permissions.canViewAccount,
            canInitiatePayments: permissions.canInitiatePayments,
            canManageAccountMembership: permissions.canManageAccountMembership,
            canManageBeneficiaries: permissions.canManageBeneficiaries,
            canManageCards: permissions.canManageCards,
          },
          node => Result.Ok(node),
        )
        .otherwise(() =>
          Result.Error(new UnauthorizedRejection("Unauthorized")),
        );
    })
    .mapOkToResult(node =>
      Option.fromPredicate(node, node =>
        statuses.includes(node.statusInfo.status),
      ).toResult(new UnauthorizedRejection("Invalid status")),
    );
};
