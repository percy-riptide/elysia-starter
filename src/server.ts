import { bearer } from "@elysiajs/bearer";
import { cors } from "@elysiajs/cors";
import { Elysia, Context, t } from "elysia";
import { auth, OpenAPI } from "@/lib/auth.ts";
import { openapi } from '@elysiajs/openapi';
import { rateLimit } from "elysia-rate-limit";
import {config} from "@/config.ts";
import logixlysia from "logixlysia";
import { logger } from "@/services/logger.ts";
import { errorHandler } from "@/services/errorHandler.ts";
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

const generalRateLimit = rateLimit({
	duration: 60 * 1000,
	max: 100,
	errorResponse: new Response(
	  JSON.stringify({ error: "Too many requests, please try again later." }),
	  {
		status: 429,
		headers: { "Content-Type": "application/json" },
	  }
	),
	generator: (request, server) => {
	  const forwarded = request.headers.get("x-forwarded-for");
	  const realIp = request.headers.get("x-real-ip");
	  const ip = forwarded?.split(",")[0]?.trim() || realIp || request.headers.get("cf-connecting-ip") || "unknown";
	  return ip;
	},
});

const betterAuth = new Elysia({ name: "better-auth" })
	.mount(auth.handler)
	.macro({
		auth: {
			async resolve({ status, request: { headers } }) {
				const session = await auth.api.getSession({
					headers,
				});

				if (!session) return status(401);

				return {
					user: session.user,
					session: session.session,
				};
			},
		},
	});

const enforceHttps = (context: Context) => {
	if (config.NODE_ENV === "production" && config.API_URL.startsWith("https://")) {
		const forwardedProto = context.request.headers.get("x-forwarded-proto");
		const requestUrl = new URL(context.request.url);
		const isHttps = forwardedProto === "https" || requestUrl.protocol === "https:";
		
		if (!isHttps) {
			context.set.status = 403;
			return {
				error: "HTTPS required",
				message: "This API requires HTTPS. Please use HTTPS to access this endpoint.",
			};
		}
	}
};


const setSecurityHeaders = (context: Context) => {
	const path = new URL(context.request.url).pathname;
	const isOpenApiRoute = path.startsWith("/openapi");
	
	context.set.headers["X-Frame-Options"] = "DENY";
	context.set.headers["X-Content-Type-Options"] = "nosniff";
	context.set.headers["X-XSS-Protection"] = "1; mode=block";
	context.set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
	context.set.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
	
	if (isOpenApiRoute) {
		context.set.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; img-src 'self' data: https:;";
		context.set.headers["X-Frame-Options"] = "SAMEORIGIN";
	} else {
		context.set.headers["Content-Security-Policy"] = "default-src 'self'";
	}
	
	if (config.NODE_ENV === "production") {
		if (config.API_URL.startsWith("https://")) {
			context.set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
		}
	}
};

const betterAuthComponents = await OpenAPI.components;
const betterAuthPaths = await OpenAPI.getPaths();

export const app = new Elysia()
	.onError(errorHandler)
	.onBeforeHandle((context) => {
		const httpsCheck = enforceHttps(context);
		if (httpsCheck) {
			return httpsCheck;
		}
		const contentLength = context.request.headers.get("content-length");
		if (contentLength) {
			const size = parseInt(contentLength, 10);
			if (!isNaN(size) && size > config.MAX_REQUEST_BODY_SIZE) {
				context.set.status = 413;
				return {
					error: "Request entity too large",
					message: `Request body size (${size} bytes) exceeds maximum allowed size (${config.MAX_REQUEST_BODY_SIZE} bytes)`,
					maxSize: config.MAX_REQUEST_BODY_SIZE,
					actualSize: size,
				};
			}
		}
	})
	.onRequest((context) => {
		const timeoutStart = Date.now();
		let timeoutOccurred = false;
		
		const timeoutId = setTimeout(() => {
			timeoutOccurred = true;
			const method = context.request.method;
			const path = new URL(context.request.url).pathname;
			const elapsed = Date.now() - timeoutStart;
			logger.warn(`Request timeout: ${method} ${path} (elapsed: ${elapsed}ms, timeout: ${config.REQUEST_TIMEOUT_MS}ms)`);
		}, config.REQUEST_TIMEOUT_MS);
		
		(context as any).__timeoutId = timeoutId;
		(context as any).__timeoutStart = timeoutStart;
		(context as any).__timeoutOccurred = () => timeoutOccurred;
	})
	.onBeforeHandle((context) => {
		const timeoutOccurred = (context as any).__timeoutOccurred as (() => boolean) | undefined;
		if (timeoutOccurred?.()) {
			const method = context.request.method;
			const path = new URL(context.request.url).pathname;
			const timeoutStart = (context as any).__timeoutStart as number | undefined;
			const elapsed = timeoutStart ? Date.now() - timeoutStart : config.REQUEST_TIMEOUT_MS;
			
			context.set.status = 504;
			return {
				error: "Request timeout",
				message: `The request took longer than ${config.REQUEST_TIMEOUT_MS}ms to complete. Please try again or contact support if the problem persists.`,
				timeout: config.REQUEST_TIMEOUT_MS,
			};
		}
	})
	.onAfterHandle((context: Context) => {
		const timeoutId = (context as any).__timeoutId;
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		
		const timeoutStart = (context as any).__timeoutStart as number | undefined;
		if (timeoutStart) {
			const elapsed = Date.now() - timeoutStart;
			if (elapsed > config.REQUEST_TIMEOUT_MS * 0.8) {
				const method = context.request.method;
				const path = new URL(context.request.url).pathname;
				logger.warn(`Slow request detected: ${method} ${path} (elapsed: ${elapsed}ms, timeout: ${config.REQUEST_TIMEOUT_MS}ms)`);
			}
		}
		
		setSecurityHeaders(context);
	})
	.use(logixlysia({
		config: {
			showStartupMessage: false,
			startupMessageFormat: "simple",
			timestamp: {
				translateTime: "yyyy-mm-dd HH:MM:ss",
			},
			ip: true,
			useColors: true,
			logFilePath: "./logs/app.log",
			logRotation: config.NODE_ENV === "production" ? {
				maxSize: "10m",
				interval: "1d",
				maxFiles: "7d",
				compress: true,
			} : undefined,
			disableFileLogging: config.NODE_ENV === "development",
			customLogFormat: 'AUTO LOGGER: {now} {level} {duration} {method} {pathname} {status} {message} {ip}',
			pino: {
				enabled: false,
			}
		},
	}))
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
		}),
		detail: {
			tags: ["General"],
			summary: "Root endpoint",
			description: "Returns a simple hello world message",
		},
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