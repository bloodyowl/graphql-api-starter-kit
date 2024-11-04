# App source

## Structure

- [`clients`](./clients/): APIs the app consume
- [`db`](./db/): database queries
- [`events`](./events/): kafka event handlers
- [`graphql`](./graphql/):
  - [`partner`](./graphql/partner/): schema and resolvers for the exposed partner API
  - [`rejections`](./graphql/rejections/): rejections that can be shared between schemas
- [`metrics`](./metrics/): utils for collecting metrics
- [`tests`](./tests/): test utilities
- [`utils`](./utils/): misc utilities
