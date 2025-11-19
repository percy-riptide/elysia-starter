import type { AuthContext } from "./betterAuth";

declare global {
	namespace Elysia {
		interface Macro {
			auth: {
				auth: AuthContext;
			};
		}
	}
}