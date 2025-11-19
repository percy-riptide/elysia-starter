import { config } from "@/config.ts";

export const requestValidation = (context: any) => {
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
};

