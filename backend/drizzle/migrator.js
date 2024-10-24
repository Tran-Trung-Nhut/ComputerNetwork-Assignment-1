"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const path_1 = __importDefault(require("path"));
const db_1 = require("../src/db/db");
(0, migrator_1.migrate)(db_1.db, { migrationsFolder: path_1.default.resolve("drizzle") })
    .then(() => {
    console.log("Migrations completed!");
    process.exit(0);
})
    .catch((err) => {
    console.log("migrations fail!", err);
    process.exit(1);
});
