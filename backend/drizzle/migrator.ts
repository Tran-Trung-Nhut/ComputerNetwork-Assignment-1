import { migrate } from  "drizzle-orm/node-postgres/migrator"
import path from "path"
import { db } from "../src/db/db"

migrate(db, {migrationsFolder: path.resolve("drizzle")})
.then(() => {
    console.log("Migrations completed!")
    process.exit(0)
})
.catch((err) => {
    console.log("migrations fail!", err);
    process.exit(1)
})