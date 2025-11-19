import { config } from "@/config.ts";
import { logger } from "@/services/logger.ts";

export const errorHandler = (context: any) => {
	const method = context.request.method;
	const path = new URL(context.request.url).pathname;
	const ip = context.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
		|| context.request.headers.get("x-real-ip") 
		|| context.request.headers.get("cf-connecting-ip") 
		|| "unknown";

	const code = context.code;
	const error = context.error;

	let statusCode = 500;
	let errorMessage = "Internal server error";
	let errorDetails: unknown = undefined;

	const codeStr = String(code || "");
	if (codeStr === "VALIDATION") {
		statusCode = 400;
		errorMessage = "Validation error";
		errorDetails = error;
	} else if (codeStr === "NOT_FOUND") {
		statusCode = 404;
		errorMessage = "Resource not found";
	} else if (codeStr === "PARSE") {
		statusCode = 400;
		errorMessage = "Invalid request format";
	} else if (codeStr === "INTERNAL_SERVER_ERROR") {
		statusCode = 500;
		errorMessage = "Internal server error";
	} else if (error instanceof Error) {
		if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
			statusCode = 503;
			errorMessage = "Service temporarily unavailable";
		} else if (error.message.includes("Unauthorized") || error.message.includes("Forbidden")) {
			statusCode = 401;
			errorMessage = "Unauthorized";
		} else {
			errorMessage = config.NODE_ENV === "production" 
				? "Internal server error" 
				: error.message;
		}
	}

	const errorInfo = error instanceof Error 
		? `${error.name}: ${error.message}${config.NODE_ENV !== "production" && error.stack ? `\nStack: ${error.stack}` : ""}`
		: String(error);
	
	const logMessage = `[${statusCode}] ${method} ${path} (IP: ${ip}) - Code: ${codeStr || "UNKNOWN"} - ${errorInfo}`;

	if (statusCode >= 500) {
		logger.error(`Server Error ${logMessage}`);
	} else {
		logger.warn(`Client Error ${logMessage}`);
	}

	context.set.status = statusCode;

	return {
		error: errorMessage,
		...(config.NODE_ENV !== "production" && errorDetails ? { details: errorDetails } : {}),
		...(config.NODE_ENV !== "production" && error instanceof Error && error.stack ? { stack: error.stack } : {}),
		timestamp: new Date().toISOString(),
		path,
	};
};

export const formatError = (error: unknown, context?: string): string => {
	const contextPrefix = context ? `[${context}] ` : "";
	if (error instanceof Error) {
		const stackTrace = error.stack ? `\nStack Trace:\n${error.stack}` : "";
		return `${contextPrefix}${error.name}: ${error.message}${stackTrace}`;
	}
	return `${contextPrefix}${String(error)}`;
};