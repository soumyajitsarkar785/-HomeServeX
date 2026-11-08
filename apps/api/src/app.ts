import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { servicesRouter } from './modules/services/services.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { customerRouter } from './modules/customers/customers.routes.js';
import { providerRouter } from './modules/providers/providers.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { enterpriseRouter } from './modules/enterprise/enterprise.routes.js';
import { isCorsOriginAllowed } from './middleware/corsOrigin.js';

import fs from 'fs';
import path from 'path';

function getWorkspaceRoot(): string {
  let curr = process.cwd();
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml')) || (fs.existsSync(path.join(curr, 'package.json')) && fs.existsSync(path.join(curr, 'apps')))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return process.cwd();
}

const workspaceRoot = getWorkspaceRoot();

// Ensure hero image is available to all workspaces
try {
  const sourcePath = path.join(workspaceRoot, 'apps/customer/public/hero-technician.jpg');
  const targetDirs = [
    path.join(workspaceRoot, 'apps/customer/public'),
    path.join(workspaceRoot, 'apps/admin/public'),
    path.join(workspaceRoot, 'apps/partner/public'),
    path.join(workspaceRoot, 'apps/api/public'),
  ];
  if (fs.existsSync(sourcePath)) {
    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const targetFile = path.join(dir, 'hero-technician.jpg');
      if (!fs.existsSync(targetFile)) {
        fs.copyFileSync(sourcePath, targetFile);
      }
    }
  }
} catch {
  // Graceful fallback if path unavailable
}

export function createApp() {
  const app = express();

  // Basic Security & Parsing Middleware
  app.use(cors({
    origin: (origin, callback) => callback(null, isCorsOriginAllowed(origin, config.corsAllowedOrigins)),
    credentials: true,
  }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Static uploads directory for admin uploaded photos
  const uploadsDir = path.resolve(workspaceRoot, 'apps/api/public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Hero asset static endpoint - serves from customer public or redirects gracefully
  app.get(['/hero-technician.jpg', '/assets/hero-technician.jpg'], (_req, res) => {
    const candidatePaths = [
      path.join(workspaceRoot, 'apps/customer/public/hero-technician.jpg'),
      path.join(workspaceRoot, 'apps/api/public/hero-technician.jpg'),
      path.resolve(process.cwd(), 'public/hero-technician.jpg'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.sendFile(p);
        return;
      }
    }
    res.redirect('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80');
  });

  // Root and Health Endpoints
  app.use('/', healthRouter);

  // API v1 Router
  const apiV1Router = express.Router();

  // Version status
  apiV1Router.get('/status', (_req, res) => {
    res.json({ success: true, message: 'HomeServeX API v1 Operational', version: '1.0.0' });
  });

  // Mount feature routers
  apiV1Router.use('/auth', authRouter);
  apiV1Router.use('/', enterpriseRouter);
  apiV1Router.use('/services', servicesRouter);
  apiV1Router.use('/bookings', bookingsRouter);
  apiV1Router.use('/customers', customerRouter);
  apiV1Router.use('/providers', providerRouter);
  apiV1Router.use('/admin', adminRouter);
  apiV1Router.use('/payments', paymentsRouter);

  app.use('/api/v1', apiV1Router);

  // Catch-all 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'The requested API route was not found' },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
