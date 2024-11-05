# GraphQL

## See the currently exposed schemas

You can go to `src/graphql/schemas` to have a look at the schemas you're currently exposing.

## Refine auth

You can use `t.withAuth(config).field(...)` or `t.withAuth(config).loadable(...)` to filter on the accepted auth contexts.

```ts
t.withAuth({ authenticated: true }); // only accept authenticated requests
t.withAuth({ user: true }); // only accept user requests
t.withAuth({ project: true }); // only accept project requests
t.withAuth({ projectMember: true }); // only accept project member requests
t.withAuth({ $any: { user: true, projectMember: true } }); // only both user & project member requests
```

## Limit visibility on a subgraph

You can limit the subgraphs a field is published on using the `subGraphs` option. By default, a field is exposed to all subgraphs.

Unused types are automatically filtered out from the output schema.

```ts
t.field({
  // Only on internal subgraph
  subGraphs: ["internal"],
});

t.field({
  // Only for development
  subGraphs: [],
});
```

## Create a dataloaded object

```ts
export type PetType = "Cat" | "Dog" | "Giraffe";

type Pet = { id: string; type: PetType; ownerId: string };

export const Pet = builder.objectRef<Pet>("Pet");

export const load = async (ids: string[], context: RequestContext) => {
  return await Future.all(
    ids.map(id =>
      getPetById({ id }, context.db)
        // We need to cast as `Pet` as DataLoader doesn't accept `null`
        .map(result => result.toOption().toNull() as Pet),
    ),
  );
};

export const PetRef = builder.loadableNode(Pet, {
  id: {
    resolve: pet => pet.id,
  },
  load,
  fields: t => ({
    id: t.exposeID("id", { nullable: false }),
    type: t.expose("type", { type: PetType, nullable: false }),
    ownerId: t.exposeID("ownerId", { nullable: false }),
  }),
});
```

## Create a dataloaded connection

### Define the connection ref

```ts
export const PetConnection = builder.connectionObject({
  type: PetRef,
  name: "PetConnection",
});
```

### On the parent field

For instance here, on the `Query` object:

```ts
builder.queryType({
  fields: t => ({
    // ...
    pets: t.loadable({
      type: PetConnection,
      args: {
        // Provides the connection args
        ...t.arg.connectionArgs(),
        // You can add filters
        types: t.arg({ type: [PetType] }),
      },
      // Provide your dataloader
      load: async (argsValues: EncodedArgs<PetArgs>[], context) =>
        Future.all(argsValues.map(args => pets(decodeArgs(args), context)))
          .map(Result.all)
          .resultToPromise(),
      resolve: (_, args) => encodeArgs(args),
    }),
  }),
});
```

### In the query logic

```ts
export type PetArgs = DefaultConnectionArguments & {
  types?: PetType[] | undefined | null;
};

export const pets = (
  args: PetArgs,
  context: AuthenticatedRequestContext<UserAuth>,
) => {
  const types = args.types ?? petTypes.array;
  const userId = context.auth.userId;

  context.log.info(`pets (${types})`);

  return Future.fromPromise(
    // Resolves the correct pageInfo/cursor
    resolveCursorConnection(
      {
        args: args,
        toCursor: node =>
          getCursorForOrderBy(node, "createdAt", x => x.toISOString()),
      },
      (connectionArgs: ResolveCursorConnectionArgs) => {
        return getPetsConnection(
          {
            ...connectionArgs,
            types,
            userId,
            orderBy: "createdAt",
          },
          context.db,
        )
          .tapOk(pets => {
            // Primes the cache for future access
            pets.forEach(pet => {
              PetRef.getDataloader(context).prime(pet.id, pet);
            });
          })
          .resultToPromise();
      },
    ),
  )
    .mapError(err => new DatabaseError(err))
    .mapOk(connection => ({
      ...connection,
      // `Lazy` makes the totalCount data loaded as well!
      totalCount: Lazy(() => countPets({ types, userId }, context.db)),
    }))
    .tapError(error => context.log.warn(error, error.message));
};
```

### To access the database

```ts
type Filters = {
  types: PetType[];
  userId: string;
};

type Input = ResolveCursorConnectionArgs &
  Filters & {
    orderBy: "createdAt";
  };

export const getPetsConnection = (
  { before, after, limit, inverted, types, orderBy, userId }: Input,
  db: Db,
) => {
  // Extracts the query information from the cursor
  const cursor = extractCursorForOrderBy(
    { before, after },
    field => new Date(field),
  ).toUndefined();

  let query = db
    .selectFrom("Pet")
    .selectAll()
    .where("ownerId", "=", userId)
    .where("type", "in", types);

  const whereOrderBy = toWhereClause({
    fieldName: orderBy,
    ...cursor?.field,
  });
  const whereId = toWhereClause({
    fieldName: "id",
    ...cursor?.id,
  });

  if (whereOrderBy.isSome()) {
    query = query.where(...whereOrderBy.get());
  }

  if (whereId.isSome()) {
    query = query.where(...whereId.get());
  }

  return Future.fromPromise(
    query
      .limit(limit)
      .orderBy(orderBy, inverted ? "desc" : "asc")
      .orderBy("id", inverted ? "desc" : "asc")
      .execute(),
  )
    .mapError(err => new DatabaseError(err))
    .mapOk(pets => Array.filterMap(pets, pet => fromDb(pet).toOption()));
};
```

## Extend an external object

```ts
const UserRef = builder.externalRef(
  "User",
  builder.selection<{ id: string }>("id"),
);

UserRef.implement({
  // Requirements on external object
  externalFields: t => ({
    id: t.id({ nullable: false }),
  }),
  fields: t => ({
    pets: t.loadable({
      type: PetConnection,
      args: {
        ...t.arg.connectionArgs(),
        types: t.arg({ type: [PetType] }),
      },
      load: async (argsValues: EncodedArgs<UserPetArgs>[], context) =>
        Future.all(argsValues.map(args => userPets(decodeArgs(args), context)))
          .map(Result.all)
          .resultToPromise(),
      resolve: (parent, args) => encodeArgs({ ...args, userId: parent.id }),
    }),
  }),
});
```
