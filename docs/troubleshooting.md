# HomeServeX — Troubleshooting Guide

## Common Issues & Solutions

### 1. Database Connection Errors

- **Symptom**: `PrismaClientInitializationError: Can't reach database server`.
- **Solution**: For local development, check that `DATABASE_URL` in `.env` is set to `"file:./dev.db"`. If using PostgreSQL, ensure the PostgreSQL service is active (`systemctl status postgresql` or Windows Services `pg_ctl status`) and the port 5432 is accessible.

### 2. Port Conflicts

- **Symptom**: `EADDRINUSE: address already in use :::5000` or `:::5173`.
- **Solution**:
  - Windows: Run `netstat -ano | findstr :5000` to find PID, then `taskkill /F /PID <pid>`.
  - Alternatively change `PORT` in `.env` or the port setting in `vite.config.ts`.

### 3. Role Access Denied

- **Symptom**: `403 Forbidden: Insufficient role permissions`.
- **Solution**: Confirm user role in database. Customer tokens cannot execute partner (`PROVIDER`) or administrative (`ADMIN`) endpoints.

### 4. OTP Verification Failures

- **Symptom**: `Invalid or expired OTP`.
- **Solution**: OTPs expire in 15 minutes by default and allow a maximum of 3 failed attempts before being permanently invalidated. If expired, request a fresh OTP from the customer portal.
