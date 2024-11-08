import { integer, numeric, pgTable, primaryKey, text, uuid, varchar } from "drizzle-orm/pg-core";

export const peer = pgTable("peer",{
    ID: varchar('ID',{ length: 255 }).primaryKey(),
})

export const file = pgTable("file",{
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    uploadTime: integer('uploadTime').notNull(),
    completedFile: integer('completedFile').notNull(),
    peerID: varchar('peerID', { length: 255 }).notNull().references(() => peer.ID)
})

export const peerConnectPeer = pgTable("peerConnectPeer",{
    peerID1: varchar('peerID1', { length: 255 }).notNull(),
    peerID2: varchar('peerID2', { length: 255 }).notNull()
},() => ({
    primaryKey: ['peerID1', 'peerID2']
}))
