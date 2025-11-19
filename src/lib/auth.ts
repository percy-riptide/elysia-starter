import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "@/db/index.ts";
import { authSchema } from "@/db/schema.ts";
import { config } from "@/config.ts";

export const auth = betterAuth({
    basePath: "/api/v1/auth",
    database: drizzleAdapter(db, {
        provider: "mysql",
        schema: authSchema,
    }),
    advanced: {
        database: {
          generateId: false,
        },
    },
    emailAndPassword: { 
        enabled: true,
        minPasswordLength: 8,
        autoSignIn: true,
        password: {
            hash: (password: string) => Bun.password.hash(password),
            verify: ({ password, hash }) => Bun.password.verify(password, hash),
        },
        session: {
            expiresIn: 60 * 60 * 24,
            cookieCache: {
              enabled: true,
              maxAge: 60 * 5,
            },
        },
    },
    trustedOrigins: config.ALLOWED_ORIGINS.split(","),
    plugins: [
        openAPI(),
    ],
});

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema> | null = null;

const getSchema = async () => {
    if (!_schema) {
        _schema = auth.api.generateOpenAPISchema();
    }
    return _schema;
};

export const OpenAPI = {
    getPaths: (prefix = "/api/v1/auth") =>
        getSchema().then(({ paths }) => {
            const reference: typeof paths = Object.create(null);

            for (const path of Object.keys(paths)) {
                const pathValue = paths[path];
                if (!pathValue) continue;
                
                const key = prefix + path;
                reference[key] = pathValue;

                for (const method of Object.keys(pathValue)) {
                    const operation = (reference[key] as any)[method];

                    if (operation) {
                        operation.tags = ["Better Auth"];
                    }
                }
            }

            return reference;
        }) as Promise<any>,
    components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;