# HomeServeX — Testing Strategy

## Test Levels

1. **Unit Tests (Vitest)**:
   - Price calculation, discounts, commissions, taxes in paise.
   - OTP generator, SHA-256 hash validation, attempt and expiration gates.
   - State machine transition validations.
   - Zod validation schemas.
2. **Integration Tests (Supertest / Vitest)**:
   - Auth registration, token rotation, role boundaries.
   - Booking creation and slot validation.
   - Atomic job acceptance under simulated concurrency.
   - OTP verification handshake.
3. **End-to-End Tests (Playwright)**:
   - Complete workflow: Customer booking -> Partner acceptance -> Start OTP -> Completion OTP -> Review submission -> Admin verification.

## Running Tests

- Run all unit and integration tests:

  ```bash
  npm run test
  ```

- Run E2E tests:

  ```bash
  npm run test:e2e
  ```

- Run strict TypeScript check:

  ```bash
  npm run typecheck
  ```
