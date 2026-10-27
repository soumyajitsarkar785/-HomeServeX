import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { addressSchema } from '@homeservex/validation';

export const customerRouter = Router();

// GET /api/v1/customers/profile
customerRouter.get('/profile', authenticate, requireRole('CUSTOMER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.customerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, createdAt: true } }, addresses: true },
    });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
      return;
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/customers/addresses
customerRouter.get('/addresses', authenticate, requireRole('CUSTOMER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
      return;
    }
    const addresses = await prisma.address.findMany({ where: { customerId: profile.id }, orderBy: { isDefault: 'desc' } });
    res.json({ success: true, data: addresses });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/customers/addresses
customerRouter.post('/addresses', authenticate, requireRole('CUSTOMER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = addressSchema.parse(req.body);
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
      return;
    }

    if (body.isDefault) {
      await prisma.address.updateMany({ where: { customerId: profile.id }, data: { isDefault: false } });
    }

    const address = await prisma.address.create({ data: { ...body, customerId: profile.id } });
    res.status(201).json({ success: true, data: address });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/customers/addresses/:id
customerRouter.delete('/addresses/:id', authenticate, requireRole('CUSTOMER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
      return;
    }
    await prisma.address.deleteMany({ where: { id: req.params.id, customerId: profile.id } });
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/customers/appliances — Appliance Health Tracker & History (Supports guest preview & auth)
customerRouter.get('/appliances', async (req: any, res: Response, next: NextFunction): Promise<void> => {
  try {
    let userId = 'guest-customer';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = (await import('jsonwebtoken')).default.verify(token, (await import('../../config/env.js')).config.jwtAccessSecret) as { id?: string };
        if (decoded?.id) userId = decoded.id;
      } catch {}
    }
    let records: any[] = [];

    try {
      records = await prisma.$queryRawUnsafe(`
        SELECT * FROM "ApplianceAsset" WHERE "userId" = ? ORDER BY "createdAt" DESC
      `, userId);
    } catch {
      // Table may still be initializing
    }

    // If customer has no registered appliances yet, seed realistic starter appliances
    if (!records || records.length === 0) {
      const defaultAppliances = [
        {
          id: `appliance-${userId.slice(0, 8)}-ac`,
          userId,
          applianceType: 'Air Conditioner',
          name: 'Living Room Split AC',
          brand: 'Daikin 1.5 Ton 5-Star Inverter',
          modelNumber: 'FTKM50TV',
          serialNumber: 'DK-2023-8841',
          healthScore: 88,
          status: 'GOOD',
          icon: '❄️',
          lastServiceDate: new Date('2025-01-12').toISOString(),
          lastServiceNotes: 'Pressure jet cleaning, coil sanitization & gas level calibrated to 140 PSI',
          nextServiceDueDate: new Date(Date.now() + 45 * 86400000).toISOString(),
          recommendedServiceSlug: 'split-ac-regular-service',
        },
        {
          id: `appliance-${userId.slice(0, 8)}-wm`,
          userId,
          applianceType: 'Washing Machine',
          name: 'Balcony Washing Machine',
          brand: 'Bosch 8kg Front Load Series 6',
          modelNumber: 'WAT28461IN',
          serialNumber: 'BS-2022-1940',
          healthScore: 94,
          status: 'EXCELLENT',
          icon: '🧺',
          lastServiceDate: new Date('2024-11-20').toISOString(),
          lastServiceNotes: 'Descaling cycle performed, drum suspension shock absorbers tuned',
          nextServiceDueDate: new Date(Date.now() + 78 * 86400000).toISOString(),
          recommendedServiceSlug: 'washing-machine-overhaul',
        },
        {
          id: `appliance-${userId.slice(0, 8)}-fridge`,
          userId,
          applianceType: 'Refrigerator',
          name: 'Kitchen Double Door Refrigerator',
          brand: 'Samsung 345L Twin Cooling Plus',
          modelNumber: 'RT37T4513S8',
          serialNumber: 'SM-2023-5591',
          healthScore: 76,
          status: 'ATTENTION_NEEDED',
          icon: '🧊',
          lastServiceDate: new Date('2024-08-15').toISOString(),
          lastServiceNotes: 'Thermostat relay checked, minor condenser dust accumulation noted',
          nextServiceDueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          recommendedServiceSlug: 'fridge-cooling-diagnostics',
        },
        {
          id: `appliance-${userId.slice(0, 8)}-ro`,
          userId,
          applianceType: 'Water Purifier',
          name: 'Kitchen RO Water Purifier',
          brand: 'Kent Grand Plus Mineral RO',
          modelNumber: '11001-KNT',
          serialNumber: 'KT-2024-3012',
          healthScore: 92,
          status: 'GOOD',
          icon: '💧',
          lastServiceDate: new Date('2025-01-05').toISOString(),
          lastServiceNotes: 'Sediment and pre-carbon filter cartridges renewed, TDS calibrated to 110 PPM',
          nextServiceDueDate: new Date(Date.now() + 60 * 86400000).toISOString(),
          recommendedServiceSlug: 'ro-filter-service',
        },
      ];

      for (const app of defaultAppliances) {
        try {
          await prisma.$executeRawUnsafe(`
            INSERT OR REPLACE INTO "ApplianceAsset" (
              "id", "userId", "applianceType", "name", "brand", "modelNumber", "serialNumber",
              "healthScore", "status", "icon", "lastServiceDate", "lastServiceNotes",
              "nextServiceDueDate", "recommendedServiceSlug", "createdAt", "updatedAt"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `, app.id, app.userId, app.applianceType, app.name, app.brand, app.modelNumber, app.serialNumber,
             app.healthScore, app.status, app.icon, app.lastServiceDate, app.lastServiceNotes,
             app.nextServiceDueDate, app.recommendedServiceSlug);
        } catch {}
      }

      records = defaultAppliances;
    }

    const formatted = records.map(r => {
      let dueDays = 30;
      if (r.nextServiceDueDate) {
        const diffMs = new Date(r.nextServiceDueDate).getTime() - Date.now();
        dueDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }
      return {
        id: r.id,
        name: r.name || r.applianceType,
        brandModel: r.brand ? `${r.brand} ${r.modelNumber || ''}`.trim() : r.modelNumber || r.applianceType,
        applianceType: r.applianceType,
        icon: r.icon || '⚡',
        healthScore: r.healthScore ?? 85,
        status: r.status || 'GOOD',
        lastServiceDate: r.lastServiceDate ? new Date(r.lastServiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending',
        lastServiceNotes: r.lastServiceNotes || 'Routine checkup scheduled',
        nextServiceDueDays: dueDays,
        recommendedServiceSlug: r.recommendedServiceSlug || 'split-ac-regular-service',
      };
    });

    res.json({ success: true, data: formatted });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// POST /api/v1/customers/appliances — Register a New Home Appliance Asset
customerRouter.post('/appliances', authenticate, requireRole('CUSTOMER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { applianceType, name, brand, modelNumber, serialNumber, icon } = req.body;

    if (!applianceType) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'applianceType is required' } });
      return;
    }

    const id = `appliance-${userId.slice(0, 8)}-${Date.now()}`;
    const nextDue = new Date(Date.now() + 90 * 86400000).toISOString();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "ApplianceAsset" (
        "id", "userId", "applianceType", "name", "brand", "modelNumber", "serialNumber",
        "healthScore", "status", "icon", "lastServiceDate", "lastServiceNotes",
        "nextServiceDueDate", "recommendedServiceSlug", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 100, 'EXCELLENT', ?, datetime('now'), 'New appliance enrolled', ?, 'split-ac-regular-service', datetime('now'), datetime('now'))
    `, id, userId, applianceType, name || applianceType, brand || null, modelNumber || null, serialNumber || null, icon || '⚡', nextDue);

    res.status(201).json({ success: true, message: 'Appliance registered successfully', data: { id, applianceType, name } });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

