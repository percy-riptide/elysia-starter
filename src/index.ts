import { config } from "@/config.ts";
import { app } from "@/server.ts";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, closePool } from "@/db/index.ts";
import path from "path";
import { logger } from "@/services/logger.ts";
import { formatError } from "@/services/errorHandler.ts";

const signals = ["SIGINT", "SIGTERM"];

for (const signal of signals) {
	process.on(signal, async () => {
		logger.info(`Received ${signal}. Initiating graceful shutdown...`);
		try {
			await app.stop();
			await closePool();
			logger.info("Graceful shutdown completed");
			process.exit(0);
		} catch (error) {
			logger.error(formatError(error, "Shutdown"));
			process.exit(1);
		}
	});
}

process.on("uncaughtException", (error) => {
	logger.error(formatError(error, "Uncaught Exception"));
	console.error("Fatal: Uncaught Exception", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	logger.error(formatError(reason, "Unhandled Rejection"));
	logger.error(`Promise: ${promise}`);
});

const runMigrations = async (): Promise<void> => {
	try {
	  logger.info("Running database migrations...");
	  const migrationsFolder = path.join(process.cwd(), "drizzle");
	  await migrate(db, { migrationsFolder });
	  logger.info("Database migrations completed successfully");
	} catch (error) {
	  logger.error(formatError(error, "Database Migration"));
	  throw error;
	}
  };

runMigrations()
  .then(() => {
    app.listen(config.PORT);
    logger.info(
      `Server is running at ${app.server?.hostname}:${app.server?.port}`
    );
  })
  .catch((error) => {
    logger.error(formatError(error, "Server Startup"));
    process.exit(1);
  });