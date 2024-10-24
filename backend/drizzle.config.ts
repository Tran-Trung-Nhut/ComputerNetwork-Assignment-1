import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dbCredentials:{
        url: 'postgresql://postgres:abc@localhost:5432/backend-comp-net?schema=public'
    }
})