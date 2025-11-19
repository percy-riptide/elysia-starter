import { config } from "@/config.ts";
import { logger } from "@/services/logger.ts";

export const requestTimeout = {
	onRequest: (context: any) => {
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
	},
	
	onBeforeHandle: (context: any) => {
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
	},
	
	onAfterHandle: (context: any) => {
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
	},
};

