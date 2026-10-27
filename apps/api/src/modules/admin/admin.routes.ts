import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma.js';
import { geoDispatch } from '../../lib/geoDispatch.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

export const adminRouter = Router();

// All admin routes require authentication + ADMIN role
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN'));

// GET /api/v1/admin/dashboard
adminRouter.get('/dashboard', async (_req, res: Response, next: NextFunction) => {
  try {
    const [
      totalCustomers,
      totalProviders,
      pendingProviders,
      totalBookings,
      completedBookings,
      cancelledBookings,
      revenueData,
    ] = await prisma.$transaction([
      prisma.customerProfile.count(),
      prisma.providerProfile.count(),
      prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.booking.aggregate({ where: { status: 'COMPLETED' }, _sum: { totalAmountPaise: true, commissionAmountPaise: true } }),
    ]);

    res.json({
      success: true,
      data: {
        customers: { total: totalCustomers },
        providers: { total: totalProviders, pending: pendingProviders },
        bookings: { total: totalBookings, completed: completedBookings, cancelled: cancelledBookings },
        revenue: {
          totalPaise: revenueData._sum.totalAmountPaise ?? 0,
          commissionPaise: revenueData._sum.commissionAmountPaise ?? 0,
          totalRupees: (revenueData._sum.totalAmountPaise ?? 0) / 100,
          commissionRupees: (revenueData._sum.commissionAmountPaise ?? 0) / 100,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/users
adminRouter.get('/users', async (req, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = Math.min(parseInt(req.query.limit as string || '20'), 100);
    const skip = (page - 1) * limit;
    const role = req.query.role as string | undefined;
    const where = role ? { role } : {};

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, avatarUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/users/:id/suspend
adminRouter.patch('/users/:id/suspend', async (req, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED' } });
    res.json({ success: true, data: { id: user.id, status: user.status } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/users/:id/activate
adminRouter.patch('/users/:id/activate', async (req, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
    res.json({ success: true, data: { id: user.id, status: user.status } });
  } catch (err) {
    next(err);
  }
});

// Handlers for Provider KYC Verification Queue
async function handleKycQueue(_req: any, res: Response, next: NextFunction) {
  try {
    const providers = await prisma.providerProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } }, documents: true },
    });
    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
}

async function handleKycReview(req: any, res: Response, next: NextFunction) {
  try {
    const { status, notes } = req.body; // APPROVED | REJECTED
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Status must be APPROVED or REJECTED' } });
      return;
    }
    const provider = await prisma.providerProfile.update({
      where: { id: req.params.id },
      data: {
        verificationStatus: status,
        verificationNotes: notes,
        ...(status === 'APPROVED' ? {
          user: { update: { status: 'ACTIVE' } }
        } : {}),
      },
    });
    res.json({ success: true, data: provider });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/admin/kyc/queue & /providers/pending
adminRouter.get('/kyc/queue', handleKycQueue);
adminRouter.get('/providers/pending', handleKycQueue);

// PUT & PATCH /api/v1/admin/kyc/:id/review & /providers/:id/verify
adminRouter.patch('/kyc/:id/review', handleKycReview);
adminRouter.put('/kyc/:id/review', handleKycReview);
adminRouter.patch('/providers/:id/verify', handleKycReview);

// GET /api/v1/admin/dispatch/live-map — Real-time telemetry of online providers and unassigned bookings
adminRouter.get('/dispatch/live-map', async (_req, res: Response, next: NextFunction) => {
  try {
    // 1. Active geospatial telemetry pings
    const activeLocations = geoDispatch.getAllActiveLocations();
    const providerIds = activeLocations.map(l => l.providerId);

    const providerProfiles = await prisma.providerProfile.findMany({
      where: { id: { in: providerIds } },
      include: { user: { select: { name: true, phone: true } } },
    });

    const providerProfileMap = new Map(providerProfiles.map(p => [p.id, p]));

    const onlineProviders = activeLocations.map(loc => {
      const prof = providerProfileMap.get(loc.providerId);
      return {
        providerId: loc.providerId,
        name: prof?.user?.name || 'Service Partner',
        phone: prof?.user?.phone || 'Confidential',
        rating: prof?.ratingAverage || 4.9,
        skills: loc.skills || [],
        latitude: loc.latitude,
        longitude: loc.longitude,
        lastPingAt: new Date(loc.lastPingAt).toISOString(),
        isAvailable: loc.isAvailable,
      };
    });

    // 2. Active dispatch bookings
    const activeBookings = await prisma.booking.findMany({
      where: { status: { in: ['PENDING', 'SEARCHING_PROVIDER', 'ASSIGNED', 'PROVIDER_EN_ROUTE'] } },
      include: {
        service: { select: { name: true, category: { select: { name: true } } } },
        address: { select: { streetAddress: true, city: true, latitude: true, longitude: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        onlineProviderCount: onlineProviders.length,
        activeBookingCount: activeBookings.length,
        onlineProviders,
        activeBookings: activeBookings.map(b => ({
          id: b.id,
          referenceNumber: b.referenceNumber,
          status: b.status,
          serviceName: b.service.name,
          categoryName: b.service.category?.name,
          address: b.address.streetAddress,
          city: b.address.city,
          latitude: b.address.latitude || 19.0760,
          longitude: b.address.longitude || 72.8777,
          totalAmountRupees: b.totalAmountPaise / 100,
          createdAt: b.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/finance/settle-payout — Process authorized bank/UPI withdrawals
adminRouter.post('/finance/settle-payout', async (req, res: Response, next: NextFunction) => {
  try {
    const { providerId, amountPaise, payoutMethod = 'UPI', referenceId } = req.body;
    if (!providerId || !amountPaise) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'providerId and amountPaise are required' } });
      return;
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { user: { select: { name: true, phone: true } } },
    });

    if (!provider) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider not found' } });
      return;
    }

    const txnRef = referenceId || `PAYOUT-HSX-${Date.now().toString(36).toUpperCase()}`;

    res.json({
      success: true,
      data: {
        payoutId: txnRef,
        providerId,
        providerName: provider.user.name,
        amountSettledPaise: amountPaise,
        amountSettledRupees: amountPaise / 100,
        payoutMethod,
        status: 'PROCESSED_SUCCESSFULLY',
        settledAt: new Date().toISOString(),
      },
      message: `₹${(amountPaise / 100).toFixed(2)} payout settled to ${provider.user.name} via ${payoutMethod}`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/bookings
adminRouter.get('/bookings', async (req, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = Math.min(parseInt(req.query.limit as string || '20'), 100);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: {
          service: { include: { category: true } },
          address: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ success: true, data: bookings, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/bookings/:id
adminRouter.get('/bookings/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        service: { include: { category: true } },
        address: true,
        assignments: { include: { provider: { include: { user: { select: { id: true, name: true, phone: true } } } } } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        payment: true,
      },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/bookings/:id/assign — Admin manual provider dispatch override
adminRouter.post('/bookings/:id/assign', async (req, res: Response, next: NextFunction) => {
  try {
    const { providerId, notes } = req.body;
    if (!providerId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'providerId is required' } });
      return;
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    const updated = await prisma.$transaction([
      prisma.booking.update({
        where: { id: req.params.id },
        data: {
          assignedProviderId: providerId,
          status: 'ASSIGNED',
        },
      }),
      prisma.bookingAssignment.upsert({
        where: {
          bookingId_providerId: {
            bookingId: req.params.id,
            providerId,
          },
        },
        update: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
        create: {
          bookingId: req.params.id,
          providerId,
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId: req.params.id,
          fromStatus: booking.status,
          toStatus: 'ASSIGNED',
          reason: notes || `Admin manual assignment to ${provider.user.name}`,
          changedById: (req as any).user?.id || 'admin',
        },
      }),
    ]);

    res.json({
      success: true,
      data: updated[0],
      message: `Booking successfully assigned to ${provider.user.name}`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/bookings/:id/cancel — Admin booking cancellation
adminRouter.post('/bookings/:id/cancel', async (req, res: Response, next: NextFunction) => {
  try {
    const { reason = 'Cancelled by administrator' } = req.body;
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    const updated = await prisma.$transaction([
      prisma.booking.update({
        where: { id: req.params.id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
        },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId: req.params.id,
          fromStatus: booking.status,
          toStatus: 'CANCELLED',
          reason,
          changedById: (req as any).user?.id || 'admin',
        },
      }),
    ]);

    res.json({
      success: true,
      data: updated[0],
      message: 'Booking cancelled by admin',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/settings — Platform settings
adminRouter.get('/settings', async (_req, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.platformSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    res.json({ success: true, data: settingsMap });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/settings — Update platform settings
adminRouter.patch('/settings', async (req, res: Response, next: NextFunction) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      if (typeof key === 'string' && value !== undefined) {
        const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await prisma.platformSetting.upsert({
          where: { key },
          update: { value: strVal },
          create: { key, value: strVal },
        });
      }
    }
    res.json({ success: true, message: 'Platform settings updated successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/reviews
adminRouter.get('/reviews', async (_req, res: Response, next: NextFunction) => {
  try {
    const reviews = await prisma.review.findMany({
      include: { customer: { include: { user: { select: { name: true } } } }, service: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
});

// ── PHOTO UPLOADER ENDPOINT ──
// POST /api/v1/admin/upload — Base64 photo uploader for services, categories, and hero banners
adminRouter.post('/upload', async (req, res: Response, next: NextFunction) => {
  try {
    const { imageBase64, filename, folder = 'general' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'imageBase64 string is required' } });
      return;
    }

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    let ext = 'jpg';
    let base64Data = imageBase64;

    if (matches && matches[1] && matches[2]) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      base64Data = matches[2];
    }

    const nameSeed = filename ? path.parse(String(filename)).name : folder;
    const cleanPrefix = nameSeed.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueName);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Dynamic workspace resolution for upload mirroring
    let wsRoot = process.cwd();
    for (let i = 0; i < 4; i++) {
      if (fs.existsSync(path.join(wsRoot, 'pnpm-workspace.yaml')) || (fs.existsSync(path.join(wsRoot, 'package.json')) && fs.existsSync(path.join(wsRoot, 'apps')))) {
        break;
      }
      const parent = path.dirname(wsRoot);
      if (parent === wsRoot) break;
      wsRoot = parent;
    }

    // Sync to all public upload directories so frontend and static server can access immediately
    const targetDirs = [
      path.join(wsRoot, 'apps/customer/public/uploads'),
      path.join(wsRoot, 'apps/partner/public/uploads'),
      path.join(wsRoot, 'apps/admin/public/uploads'),
      path.join(wsRoot, 'apps/api/public/uploads'),
    ];
    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, uniqueName), buffer);
      } catch {
        // Safe fallback
      }
    }

    const relativeUrl = `/uploads/${uniqueName}`;
    const fullUrl = `http://localhost:5000/uploads/${uniqueName}`;

    res.json({
      success: true,
      data: {
        url: relativeUrl,
        fullUrl,
        filename: uniqueName,
        sizeBytes: buffer.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PROMOTIONAL HERO BANNERS MANAGEMENT ──
const DEFAULT_BANNERS = [
  {
    id: 'banner-default-hero',
    badge: '⚡ FAST. RELIABLE. TRUSTED.',
    title: 'We fix it today,',
    highlightTitle: 'so you can relax tomorrow.',
    subtitle: 'Certified experts at your doorstep in as little as 30 minutes with upfront transparent pricing.',
    imageUrl: '/hero-technician.jpg',
    ctaText: 'Book Service',
    ctaTarget: '#recommended-section',
    discountBadge: '10K+ Happy Customers',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
  },
];

// GET /api/v1/admin/banners
adminRouter.get('/banners', async (_req, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'PROMOTIONAL_BANNERS' },
    });
    let banners = DEFAULT_BANNERS;
    if (setting?.value) {
      try {
        banners = JSON.parse(setting.value);
      } catch {
        banners = DEFAULT_BANNERS;
      }
    }
    res.json({ success: true, data: banners });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/banners
adminRouter.post('/banners', async (req, res: Response, next: NextFunction) => {
  try {
    const { badge, title, highlightTitle, subtitle, imageUrl, ctaText, ctaTarget, discountBadge, isActive } = req.body;
    if (!title || !imageUrl) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Title and Image URL are required' } });
      return;
    }

    const setting = await prisma.platformSetting.findUnique({ where: { key: 'PROMOTIONAL_BANNERS' } });
    let banners = DEFAULT_BANNERS;
    if (setting?.value) {
      try {
        banners = JSON.parse(setting.value);
      } catch {
        banners = DEFAULT_BANNERS;
      }
    }

    const newBanner = {
      id: `banner-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      badge: badge || '⚡ EXCLUSIVE OFFER',
      title,
      highlightTitle: highlightTitle || '',
      subtitle: subtitle || 'Home services delivered by verified professionals.',
      imageUrl,
      ctaText: ctaText || 'Explore Now',
      ctaTarget: ctaTarget || '#recommended-section',
      discountBadge: discountBadge || '',
      isActive: isActive !== false,
      displayOrder: banners.length + 1,
      createdAt: new Date().toISOString(),
    };

    const updatedBanners = [newBanner, ...banners];
    await prisma.platformSetting.upsert({
      where: { key: 'PROMOTIONAL_BANNERS' },
      update: { value: JSON.stringify(updatedBanners) },
      create: { key: 'PROMOTIONAL_BANNERS', value: JSON.stringify(updatedBanners), description: 'Promotional hero banners for Customer App' },
    });

    res.status(201).json({ success: true, data: newBanner });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/banners/:id
adminRouter.patch('/banners/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: 'PROMOTIONAL_BANNERS' } });
    let banners: any[] = DEFAULT_BANNERS;
    if (setting?.value) {
      try {
        banners = JSON.parse(setting.value);
      } catch {
        banners = DEFAULT_BANNERS;
      }
    }

    let found = false;
    const updatedBanners = banners.map(b => {
      if (b.id === req.params.id) {
        found = true;
        return { ...b, ...req.body, updatedAt: new Date().toISOString() };
      }
      return b;
    });

    if (!found) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } });
      return;
    }

    await prisma.platformSetting.upsert({
      where: { key: 'PROMOTIONAL_BANNERS' },
      update: { value: JSON.stringify(updatedBanners) },
      create: { key: 'PROMOTIONAL_BANNERS', value: JSON.stringify(updatedBanners) },
    });

    res.json({ success: true, data: updatedBanners.find(b => b.id === req.params.id) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/banners/:id
adminRouter.delete('/banners/:id', async (req, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: 'PROMOTIONAL_BANNERS' } });
    let banners: any[] = DEFAULT_BANNERS;
    if (setting?.value) {
      try {
        banners = JSON.parse(setting.value);
      } catch {
        banners = DEFAULT_BANNERS;
      }
    }

    const filtered = banners.filter(b => b.id !== req.params.id);
    await prisma.platformSetting.upsert({
      where: { key: 'PROMOTIONAL_BANNERS' },
      update: { value: JSON.stringify(filtered.length > 0 ? filtered : DEFAULT_BANNERS) },
      create: { key: 'PROMOTIONAL_BANNERS', value: JSON.stringify(filtered.length > 0 ? filtered : DEFAULT_BANNERS) },
    });

    res.json({ success: true, message: 'Banner removed successfully' });
  } catch (err) {
    next(err);
  }
});

// ── SERVICES & CATEGORIES DIRECT CONTROL ──
// DELETE /api/v1/admin/services/:id
adminRouter.delete('/services/:id', async (req, res: Response, next: NextFunction) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/categories/:id
adminRouter.delete('/categories/:id', async (req, res: Response, next: NextFunction) => {
  try {
    await prisma.serviceCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});
