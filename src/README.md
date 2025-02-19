# App source

## Structure

- [`db`](./db/): database queries
- [`events`](./events/): kafka event handlers
- [`graphql`](./graphql/):
  - [`mutations`](./graphql/mutations/): resolvers for mutations
  - [`objects`](./graphql/objects/): objects definitions
  - [`queries`](./graphql/queries/): queries definitions
  - [`rejections`](./graphql/rejections/): rejections definitions
  - [`schemas`](./graphql/schemas/): output schemas
- [`metrics`](./metrics/): utils for collecting metrics
- [`tests`](./tests/): test utilities
- [`utils`](./utils/): misc utilities
