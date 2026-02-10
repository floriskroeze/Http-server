import * as process from "node:process";
process.loadEnvFile();
function envOrThrow(key) {
    const envVar = process.env[key];
    if (!envVar)
        throw new Error(key + " is missing from env file");
    return envVar;
}
const api = {
    fileserverHits: 0,
    platform: envOrThrow("PLATFORM"),
    secret: envOrThrow("SECRET"),
    polkaKey: envOrThrow("POLKA_KEY")
};
const migrationConfig = {
    migrationsFolder: "./src/db/migrations"
};
const db = {
    url: envOrThrow("DB_URL"),
    migrationConfig
};
export const config = {
    api,
    db
};
