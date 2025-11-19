import { Elysia } from "elysia";
import { auth, OpenAPI } from "@/lib/auth.ts";

export const betterAuth = new Elysia({ name: "better-auth" })
	.mount(auth.handler)
	.macro({
		auth: {
			async resolve({ request: { headers } }) {
				const session = await auth.api.getSession({
					headers,
				});

				if (!session) {
					return {
						isAuthenticated: false,
						user: null,
						session: null,
					};
				}

				return {
					isAuthenticated: true,
					user: session.user,
					session: session.session,
				};
			},
		},
	});

export const betterAuthComponents = await OpenAPI.components;
export const betterAuthPaths = await OpenAPI.getPaths();

