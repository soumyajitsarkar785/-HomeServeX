import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local directory
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_homeservex_at_least_32_chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_homeservex_at_least_32_chars',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(','),
  platform: {
    defaultCurrency: process.env.PLATFORM_DEFAULT_CURRENCY || 'INR',
    commissionPercentage: parseInt(process.env.PLATFORM_COMMISSION_PERCENTAGE || '15', 10),
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10),
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  },
  payments: {
    provider: process.env.PAYMENT_PROVIDER || 'RAZORPAY',
    keyId: process.env.PAYMENT_PUBLIC_KEY || 'rzp_test_homeservex_public',
    keySecret: process.env.PAYMENT_SECRET_KEY || 'dev_payment_secret_key_homeservex_32chars',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'dev_webhook_secret_homeservex_32chars',
  },
};
