import { integer, numeric, pgTable, primaryKey, text, uuid, varchar } from "drizzle-orm/pg-core";

export const node = pgTable("node",{
    port: integer('port').notNull().primaryKey(),
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
    port: integer('port').notNull(),
    name: varchar('name',{ length: 255 }).notNull(),
})