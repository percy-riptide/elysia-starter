import type { Config } from "drizzle-kit"
import env from "env-var"

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  casing: "snake_case",
  dbCredentials: {
    host: env.get("DATABASE_HOST").default("localhost").asString(),
    port: env.get("DATABASE_PORT").default(3306).asPortNumber(),
    user: env.get("DATABASE_USER").default("root").asString(),
    password: env.get("DATABASE_PASSWORD").default("password").asString(),
    database: env.get("DATABASE_NAME").default("database").asString(),
  }
} satisfies Config