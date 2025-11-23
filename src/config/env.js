import dotenv from "dotenv";
dotenv.config({ quiet: true });

export const {
    JWT_SECRET,
    ENCRYPTION_KEY,
    MASTER_REGISTRATION_KEY,
    PORT,
    NODE_ENV,
    TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN,
    ACCESS_TOKEN_SECRET_KEY,
    REFRESH_TOKEN_SECRET_KEY,
    COOKIE_SECRET,
    CLOUD_NAME,
    CLOUD_API_KEY,
    CLOUD_API_SECRET
} = process.env;