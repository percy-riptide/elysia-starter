import env from "env-var";

export const config = {
	NODE_ENV: env.get("NODE_ENV").default("development").asEnum(["production", "test", "development"]),

	PORT: env.get("PORT").default(3000).asPortNumber(),
	API_URL: env.get("API_URL").default("http://localhost:3000").asString(),
	
	DATABASE_HOST: env.get("DATABASE_HOST").default("localhost").asString(),
	DATABASE_PORT: env.get("DATABASE_PORT").default(3306).asPortNumber(),
	DATABASE_USER: env.get("DATABASE_USER").default("root").asString(),
	DATABASE_PASSWORD: env.get("DATABASE_PASSWORD").default("password").asString(),
	DATABASE_NAME: env.get("DATABASE_NAME").default("database").asString(),
	DB_POOL_MAX_CONNECTIONS: env.get("DB_POOL_MAX_CONNECTIONS").default(10).asIntPositive(),
	
	S3_ENDPOINT: env.get("S3_ENDPOINT").default("localhost").asString(),
	S3_ACCESS_KEY_ID: env.get("S3_ACCESS_KEY_ID").default("minio").asString(),
	S3_SECRET_ACCESS_KEY: env.get("S3_SECRET_ACCESS_KEY").default("minio").asString(),
	
	LOCK_STORE: env.get("LOCK_STORE").default("memory").asEnum(["memory"]),
	
	BEARER_TOKEN: env.get("BEARER_TOKEN").default("test").asString(),
	
	ALLOWED_ORIGINS: env.get("ALLOWED_ORIGINS").default("*").asString(),
	
	PRINCESS_API_URL: env.get("PRINCESS_API_URL").default("https://orders.protocase.com/PrincessAPI").asString(),
	PRINCESS_API_KEY: env.get("PRINCESS_API_KEY").default("test-princess-api").asString(),
	
	MAX_REQUEST_BODY_SIZE: env.get("MAX_REQUEST_BODY_SIZE").default(1048576).asIntPositive(),
	
	REQUEST_TIMEOUT_MS: env.get("REQUEST_TIMEOUT_MS").default(30000).asIntPositive(),
};