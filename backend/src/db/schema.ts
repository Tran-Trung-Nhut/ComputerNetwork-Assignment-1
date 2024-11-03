import { integer, numeric, pgTable, primaryKey, text, uuid, varchar } from "drizzle-orm/pg-core";

export const node = pgTable("node",{
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 255}).notNull().unique(),
    password: varchar('password', {length: 255})
})

export const file = pgTable("file", {
    name: varchar('name', { length: 255}).notNull().primaryKey(),
    size: integer('size').notNull(),
    pieceSize: integer('pieceSize').notNull(),
    noPiece: integer('noPiece').notNull(),
})

export const nodeFile = pgTable("nodeFile",{
    id: uuid('id').defaultRandom().primaryKey(),
    nodeId: uuid('nodeId').notNull(),
    name: varchar('name',{ length: 255 }).notNull(),
})