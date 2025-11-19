import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "@/config.ts";
import { logger } from "@/services/logger.ts";

export const pool = mysql.createPool({
	host: config.DATABASE_HOST,
	port: config.DATABASE_PORT,
	user: config.DATABASE_USER,
	password: config.DATABASE_PASSWORD,
	database: config.DATABASE_NAME,
	connectionLimit: config.DB_POOL_MAX_CONNECTIONS,
	queueLimit: 0,
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
});

logger.info("Database connection pool created successfully!");

export const db = drizzle({
	client: pool,
	casing: "snake_case",
});

export const closePool = async (): Promise<void> => {
	try {
		await pool.end();
		logger.info("Database connection pool closed successfully");
	} catch (error) {
		logger.error(`Error closing database pool: ${error instanceof Error ? error.message : String(error)}`);
		throw error;
	}
};
