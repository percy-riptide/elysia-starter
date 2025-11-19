import { rateLimit } from "elysia-rate-limit";

export const generalRateLimit = rateLimit({
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

