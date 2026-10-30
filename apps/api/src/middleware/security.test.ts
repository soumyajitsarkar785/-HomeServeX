import { describe, expect, it, vi } from 'vitest';
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { authenticate, AuthenticatedRequest, requireRole } from './auth.js';
import { isCorsOriginAllowed } from './corsOrigin.js';

function createRequest(authorization?: string): AuthenticatedRequest {
  return { headers: authorization ? { authorization } : {} } as AuthenticatedRequest;
}

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe('API authentication and CORS boundaries', () => {
  it('rejects requests without a bearer token', () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn<[], void>();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens without selecting a fallback user', () => {
    const req = createRequest('Bearer invalid-token');
    const res = createResponse();
    const next = vi.fn<[], void>();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid access token and attaches its identity', () => {
    const claims = { id: 'user-123', role: 'CUSTOMER', email: 'customer@example.com' };
    const token = jwt.sign(claims, config.jwtAccessSecret);
    const req = createRequest(`Bearer ${token}`);
    const res = createResponse();
    const next = vi.fn<[], void>();

    authenticate(req, res, next);

    expect(req.user).toEqual(claims);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects requests without an authenticated identity at the role boundary', () => {
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn<[], void>();

    requireRole('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not substitute an identity when the authenticated role is insufficient', () => {
    const req = createRequest();
    req.user = { id: 'customer-123', role: 'CUSTOMER', email: 'customer@example.com' };
    const res = createResponse();
    const next = vi.fn<[], void>();

    requireRole('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(req.user.role).toBe('CUSTOMER');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows requests with a matching role', () => {
    const req = createRequest();
    req.user = { id: 'admin-123', role: 'ADMIN', email: 'admin@example.com' };
    const res = createResponse();
    const next = vi.fn<[], void>();

    requireRole('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows only unoriginated requests or configured CORS origins', () => {
    const allowedOrigins = ['https://customer.example.com'];

    expect(isCorsOriginAllowed(undefined, allowedOrigins)).toBe(true);
    expect(isCorsOriginAllowed('https://customer.example.com', allowedOrigins)).toBe(true);
    expect(isCorsOriginAllowed('https://attacker.example', allowedOrigins)).toBe(false);
    expect(isCorsOriginAllowed('http://localhost:5173', allowedOrigins)).toBe(false);
  });
});
