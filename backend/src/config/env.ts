import dotenv from "dotenv";

dotenv.config();

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  port: parseInt(optional("PORT", "3000"), 10),
  nodeEnv: optional("NODE_ENV", "development"),

  databaseUrl: optional("DATABASE_URL", ""),

  jwt: {
    accessSecret: optional("JWT_ACCESS_SECRET", "dev_access_secret_change_me"),
    refreshSecret: optional(
      "JWT_REFRESH_SECRET",
      "dev_refresh_secret_change_me",
    ),
    accessExpiry: optional("JWT_ACCESS_EXPIRY", "15m"),
    refreshExpiry: optional("JWT_REFRESH_EXPIRY", "30d"),
  },

  emailVerficationTokenExpiry: parseInt(
    optional("EMAIL_VERIFICATION_TOKEN_EXPIRY", "86400000"),
    10,
  ),

  saltRounds: parseInt(optional("BCRYPT_SALT_ROUNDS", "12"), 10),

  appUrl: optional("APP_URL", "http://localhost:3000"),

  smtp: {
    host: optional("SMTP_HOST", "smtp.gmail.com"),
    port: parseInt(optional("SMTP_PORT", "587"), 10),
    user: optional("SMTP_USER", ""),
    pass: optional("SMTP_PASS", ""),
  },

  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME", ""),
    apiKey: optional("CLOUDINARY_API_KEY", ""),
    apiSecret: optional("CLOUDINARY_API_SECRET", ""),
    uploadFolder: optional(
      "CLOUDINARY_UPLOAD_FOLDER",
      "unistay/profile-images",
    ),
  },

  openinary: {
    baseUrl: optional("OPENINARY_URL", "http://localhost:3001"),
    publicUrl: optional("OPENINARY_PUBLIC_URL", "http://localhost:3001"),
    apiKey: optional("OPENINARY_API_KEY", ""),
  },

  openrouter: {
    apiKey: optional("OPENROUTER_API_KEY", ""),
    model: optional("OPENROUTER_MODEL", "minimax/minimax-m2.5:free"),
  },
};
