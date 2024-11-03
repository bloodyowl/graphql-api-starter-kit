import { Counter } from "prom-client";

export const PetCounter = new Counter({
  name: "pets_total",
  help: "This represents the total amount of pets",
  labelNames: ["type"] as const,
});
