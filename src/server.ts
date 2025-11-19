import { bearer } from "@elysiajs/bearer";
import { cors } from "@elysiajs/cors";
import { Elysia, Context, t } from "elysia";
import { openapi } from '@elysiajs/openapi';
import {config} from "@/config.ts";
import { logger } from "@/services/logger.ts";
import { errorHandler } from "@/plugins/errorHandler.ts";
import { securityHeaders } from "@/plugins/securityHeaders.ts";
import { httpsEnforcement } from "@/plugins/httpsEnforcement.ts";
import { requestTimeout } from "@/plugins/requestTimeout.ts";
import { requestValidation } from "@/plugins/requestValidation.ts";
import { betterAuth, betterAuthComponents, betterAuthPaths } from "@/plugins/betterAuth.ts";
import { generalRateLimit } from "@/plugins/rateLimiter.ts";
import { loggerPlugin } from "@/plugins/logger.ts";
import { pool } from "@/db/index.ts";

const getAllowedOrigins = (): string[] | boolean => {
	const origins = config.ALLOWED_ORIGINS;
	if (!origins) {
	  if (config.NODE_ENV === "production") {
		logger.warn("ALLOWED_ORIGINS not set in production. Using wildcard (not recommended with credentials)");
		return true;
	  }
	  return true;
	}
	return origins.split(",").map((origin) => origin.trim());
};

export const app = new Elysia()
	.onError(errorHandler)
	.onRequest(requestTimeout.onRequest)
	.onBeforeHandle((context) => {
		const httpsCheck = httpsEnforcement(context);
		if (httpsCheck) {
			return httpsCheck;
		}
		const validationCheck = requestValidation(context);
		if (validationCheck) {
			return validationCheck;
		}
		return requestTimeout.onBeforeHandle(context);
	})
	.onAfterHandle((context: Context) => {
		requestTimeout.onAfterHandle(context);
		securityHeaders(context);
	})
	.use(loggerPlugin)
	.use(bearer())
	.use(cors({
		origin: getAllowedOrigins(),
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}))
	.use(openapi({
		documentation: {
			components: betterAuthComponents,
			paths: betterAuthPaths,
		},
	}))
	.use(generalRateLimit)
	.use(betterAuth)
	.get("/", async (context: Context) => {
		return {
			message: "Hello World",
		};
	}, {
		response: t.Object({
			message: t.String(),
		})
	})
	.get("/health", async (context: Context) => {
		const { set } = context;
		let databaseStatus = "ok";
		let databaseError: string | undefined = undefined;
		
		try {
			const connection = await pool.getConnection();
			await connection.ping();
			connection.release();
		} catch (error) {
			databaseStatus = "error";
			databaseError = error instanceof Error ? error.message : String(error);
		}

		const isHealthy = databaseStatus === "ok";
		const response = {
			status: isHealthy ? "ok" : "degraded",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			environment: config.NODE_ENV,
			database: {
				status: databaseStatus,
				...(databaseError ? { error: databaseError } : {}),
			},
		};

		if (!isHealthy) {
			set.status = 503;
		}

		return response;
	}, {
		response: t.Object({
		  status: t.String(),
		  timestamp: t.String(),
		  uptime: t.Number(),
		  environment: t.String(),
		  database: t.Object({
			status: t.String(),
			error: t.Optional(t.String()),
		  }),
		})
	});