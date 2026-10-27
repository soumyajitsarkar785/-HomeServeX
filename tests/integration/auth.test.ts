import { describe, it, expect } from 'vitest';
import { testUserCustomer, testUserProvider } from '../fixtures/sample-data.js';

describe('Auth & Role Separation Contract', () => {
  it('validates customer registration payload contracts', () => {
    expect(testUserCustomer.role).toBe('CUSTOMER');
    expect(testUserCustomer.email).toContain('@');
    expect(testUserCustomer.password.length).toBeGreaterThanOrEqual(8);
  });

  it('validates provider registration payload contracts with skills', () => {
    expect(testUserProvider.role).toBe('PROVIDER');
    expect(testUserProvider.skills.length).toBeGreaterThan(0);
  });
});
