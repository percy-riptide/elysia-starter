import { Elysia } from "elysia";
import type { Session, User } from "better-auth";
import { auth, OpenAPI } from "@/lib/auth.ts";

export type AuthContext = {
	user: User;
	session: Session;
};

export type ContextWithAuth = {
	auth: AuthContext;
};

export function getAuth(context: any): AuthContext {
	return (context as ContextWithAuth).auth;
}

export const betterAuth = new Elysia({ name: "better-auth" })
	.mount(auth.handler)
	.macro({
		auth: {
			async resolve({ status, request: { headers } }) {
				const session = await auth.api.getSession({
					headers,
				});
				if (!session) {
					return status(401);
				}
				return {
					auth: {
						user: session.user,
						session: session.session,
					} as AuthContext,
				};
			},
		},
	});

export const betterAuthComponents = await OpenAPI.components;
export const betterAuthPaths = await OpenAPI.getPaths();