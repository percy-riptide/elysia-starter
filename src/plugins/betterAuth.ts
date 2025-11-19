import { auth, OpenAPI } from "@/lib/auth.ts";
import { Elysia } from "elysia";
import type { User, Session } from "better-auth/types";

export const betterAuth = new Elysia({ name: "better-auth" })
	.mount(auth.handler);

export const authMiddleware = new Elysia({
  name: "auth-middleware",
})
  .derive(async ({ request: { headers } }) => {
    const session = await auth.api.getSession({ headers });
    return {
      user: session?.user,
      session: session,
    } as const;
  })
  .macro({
    auth: {
      async resolve({ request: { headers }, status }) {
        const session = await auth.api.getSession({ headers });
        
        if (!session || !session.user) {
          return status(401, {
            message: "Unauthorized",
          });
        }
        
        return { user: session.user as User, session: session.session as Session };
      },
    },
  });

export const betterAuthComponents = await OpenAPI.components;
export const betterAuthPaths = await OpenAPI.getPaths();