import { createLogger, type RequestInfo, type StoreData } from "logixlysia";
import { config } from "@/config.ts";

const baseLogger = createLogger({
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
		customLogFormat: 'SYSTEM LOGGER: {now} {level} {duration} {method} {pathname} {status} {message} {ip}',
		pino: {
			enabled: false,
		}
	},
});

const dummyRequest: RequestInfo = {
	headers: {
		get: () => null,
	},
	method: "SYSTEM",
	url: "/",
};

export const logger = {
	info: (message: string) => {
		baseLogger.info(dummyRequest, message);
	},
	error: (message: string) => {
		baseLogger.error(dummyRequest, message);
	},
	warn: (message: string) => {
		baseLogger.warn(dummyRequest, message);
	},
	debug: (message: string) => {
		baseLogger.debug(dummyRequest, message);
	},
};