import logixlysia from "logixlysia";
import { config } from "@/config.ts";

export const loggerPlugin = logixlysia({
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
});

