import { builder } from "#app/graphql/builder.mts";
import { DateResolver } from "graphql-scalars";

builder.addScalarType("Date", DateResolver);
