import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Outbox = {
    id: string;
    aggregateId: string;
    aggregateType: string;
    type: string;
    payload: string;
    acknowledged: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};
export type Pet = {
    id: string;
    ownerId: string;
    type: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};
export type DB = {
    Outbox: Outbox;
    Pet: Pet;
};
