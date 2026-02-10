import * as process from "node:process";
import {MigrationConfig} from "drizzle-orm/migrator";

type APIConfig = {
	fileserverHits: number;
	platform: string;
	secret: string;
	polkaKey: string;
};

type DBConfig = {
	url: string;
	migrationConfig: MigrationConfig
};

type Config = {
	api : APIConfig;
	db: DBConfig;
};

process.loadEnvFile();

function envOrThrow(key: string) {
	const envVar = process.env[key];

	if (!envVar) throw new Error(key + " is missing from env file");

	return envVar;
}

const api: APIConfig = {
	fileserverHits: 0,
	platform: envOrThrow("PLATFORM"),
	secret: envOrThrow("SECRET"),
	polkaKey: envOrThrow("POLKA_KEY")
};

const migrationConfig: MigrationConfig = {
	migrationsFolder: "./src/db/migrations"
};

const db: DBConfig = {
	url: envOrThrow("DB_URL"),
	migrationConfig
};

export const config: Config = {
	api,
	db
};
