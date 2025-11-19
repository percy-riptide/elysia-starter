import { config } from "@/config.ts";

export const httpsEnforcement = (context: any) => {
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

