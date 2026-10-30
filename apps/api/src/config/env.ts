import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local directory
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const runtimeEnvironment = process.env.NODE_ENV || 'development';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const configuredCorsOrigins = process.env.CORS_ALLOWED_ORIGINS;

if (runtimeEnvironment === 'production') {
  const invalidSecrets = [
    ['JWT_ACCESS_SECRET', jwtAccessSecret],
    ['JWT_REFRESH_SECRET', jwtRefreshSecret],
  ].filter(([, value]) => !value || value.length < 32 || value.startsWith('dev_'));

  if (invalidSecrets.length > 0) {
    throw new Error(`Production requires strong, non-development values for: ${invalidSecrets.map(([name]) => name).join(', ')}`);
  }
  if (!configuredCorsOrigins?.split(',').some((origin) => origin.trim())) {
    throw new Error('Production requires CORS_ALLOWED_ORIGINS to contain the deployed frontend origins');
  }
}

export const config = {
  env: runtimeEnvironment,
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtAccessSecret: jwtAccessSecret || 'dev_jwt_access_secret_homeservex_at_least_32_chars',
  jwtRefreshSecret: jwtRefreshSecret || 'dev_jwt_refresh_secret_homeservex_at_least_32_chars',
  corsAllowedOrigins: (configuredCorsOrigins || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
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
