import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'HomeServeX API',
  });
});

healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Database ping failed',
      timestamp: new Date().toISOString(),
    });
  }
});
