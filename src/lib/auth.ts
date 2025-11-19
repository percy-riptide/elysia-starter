import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { db } from "@/db/index.ts";

export const auth = betterAuth({
    basePath: "/api/v1/auth",
    database: drizzleAdapter(db, {
        provider: "mysql",
    }),
    emailAndPassword: { 
        enabled: true, 
    },
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