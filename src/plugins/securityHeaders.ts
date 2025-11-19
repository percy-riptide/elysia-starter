import { config } from "@/config.ts";

export const securityHeaders = (context: any) => {
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

