import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

const pool = new Pool({
    user: 'postgres',
    password: 'abc',
    host: 'localhost',
    port: 5432,
    database: 'backend-comp-net'
})

export const db = drizzle(pool)