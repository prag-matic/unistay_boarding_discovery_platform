import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  databaseUrl: optional('DATABASE_URL', ''),

  jwt: {
    accessSecret: optional('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessExpiry: optional('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiry: optional('JWT_REFRESH_EXPIRY', '30d'),
  },

  bcrypt: {
    saltRounds: parseInt(optional('BCRYPT_SALT_ROUNDS', '12'), 10),
  },

  appUrl: optional('APP_URL', 'http://localhost:3000'),

  smtp: {
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
  },

  cloudinary: {
    cloudName: optional('CLOUDINARY_CLOUD_NAME', ''),
    apiKey: optional('CLOUDINARY_API_KEY', ''),
    apiSecret: optional('CLOUDINARY_API_SECRET', ''),
    uploadFolder: optional('CLOUDINARY_UPLOAD_FOLDER', 'unistay/profile-images'),
  },
};
