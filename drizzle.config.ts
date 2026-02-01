import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "src/schema/schema.ts",
    out: "src/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: "postgres://floriskroeze:@localhost:5432/chirpy?sslmode=disable",
    },
});