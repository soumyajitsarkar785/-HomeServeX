import { Router, Response, NextFunction } from 'express';
import { enterpriseService } from './enterprise.service.js';
import { authenticate, optionalAuthenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';

export const enterpriseRouter = Router();

// ══════════════════════════════════════════════════════════════════════════
// 1. SMART SERVICE RECOMMENDATION ENGINE
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.get('/services/recommendations', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const categorySlug = req.query.category as string | undefined;
    const season = req.query.season as string | undefined;

    let customerId: string | undefined;
    if (req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id;
    }

    const result = await enterpriseService.getSmartRecommendations({
      customerId,
      lat,
      lng,
      categorySlug,
      season,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. CUSTOMER MEMBERSHIPS & LOYALTY SYSTEM
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.get('/memberships/plans', async (_req, res: Response, next: NextFunction) => {
  try {
    const plans = await enterpriseService.getMembershipPlans();
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.post('/memberships/subscribe', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.body.customerId;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id;
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id;
    }

    const { planSlug } = req.body;
    if (!planSlug) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'planSlug is required' } });
      return;
    }

    const result = await enterpriseService.subscribeMembership(customerId, planSlug);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/memberships/my-status', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.query.customerId as string;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id || '';
    }
    const mem = customerId ? await enterpriseService.getCustomerMembership(customerId) : null;
    res.json({ success: true, data: mem });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/customers/loyalty', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.query.customerId as string;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id || '';
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id || 'demo-customer-1';
    }

    const wallet = await enterpriseService.getLoyaltyWallet(customerId);
    res.json({ success: true, data: wallet });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.post('/customers/loyalty/redeem', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.body.customerId;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id;
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id || 'demo-customer-1';
    }

    const points = parseInt(req.body.points || '0', 10);
    const result = await enterpriseService.redeemLoyaltyPoints(customerId, points, req.body.bookingId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 3. HOME MAINTENANCE PROFILE
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.get('/customers/home-profile', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let userId = req.user?.id;
    if (!userId) {
      const defaultUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
      userId = defaultUser?.id;
    }

    const cp = userId ? await prisma.customerProfile.findUnique({ where: { userId } }) : null;
    const customerId = cp?.id || 'cust-profile-default';

    const profiles: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM CustomerHomeProfile WHERE customerId = ?;`, customerId);
    const homeProfile = profiles[0] || {
      customerId,
      propertyType: '3BHK Apartment',
      bedrooms: 3,
      bathrooms: 2,
      approxAreaSqFt: 1450,
      address: 'Tower 4, Flat 1204, Silver Oak Heights, Kolkata',
    };

    const appliances = userId ? await prisma.applianceAsset.findMany({ where: { userId } }) : [];

    res.json({
      success: true,
      data: {
        profile: homeProfile,
        appliances,
      },
    });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.post('/customers/home-profile/appliances', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const asset = await prisma.applianceAsset.create({
      data: {
        userId,
        applianceType: req.body.applianceType || 'Air Conditioner',
        name: req.body.name || 'Living Room Split AC',
        brand: req.body.brand || 'Daikin',
        modelNumber: req.body.modelNumber || 'FTKF50',
        healthScore: req.body.healthScore || 92,
        status: req.body.status || 'GOOD',
        lastServiceDate: req.body.lastServiceDate ? new Date(req.body.lastServiceDate) : new Date(),
        nextServiceDueDate: new Date(Date.now() + 90 * 86400000),
      },
    });

    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 4. RECURRING BOOKINGS
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.post('/bookings/recurring', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.body.customerId;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id;
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id;
    }

    const { serviceId, addressId, frequency, preferredTimeSlot } = req.body;
    if (!serviceId || !addressId || !frequency) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'serviceId, addressId and frequency are required' } });
      return;
    }

    const plan = await enterpriseService.createRecurringPlan({
      customerId,
      serviceId,
      addressId,
      frequency,
      preferredTimeSlot,
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/bookings/recurring', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.query.customerId as string;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id || '';
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id || '';
    }

    const plans = await enterpriseService.getCustomerRecurringPlans(customerId);
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.patch('/bookings/recurring/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const plan = await enterpriseService.updateRecurringPlanStatus(req.params.id || '', status);
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 5. DIGITAL WORK EVIDENCE (BEFORE & AFTER PHOTOS)
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.post('/bookings/:id/evidence', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bookingId = req.params.id || '';
    const { stage, photoUrls, notes } = req.body;

    let providerId = req.body.providerId;
    if (!providerId && req.user?.id) {
      const pp = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
      providerId = pp?.id;
    }
    if (!providerId) {
      const defaultP = await prisma.providerProfile.findFirst();
      providerId = defaultP?.id || 'pro-verified-1';
    }

    const evidence = await enterpriseService.addWorkEvidence({
      bookingId,
      providerId,
      stage: stage || 'BEFORE_WORK',
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [photoUrls || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952'],
      notes,
    });

    res.status(201).json({ success: true, data: evidence });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/bookings/:id/evidence', async (req, res: Response, next: NextFunction) => {
  try {
    const evidence = await enterpriseService.getWorkEvidence(req.params.id);
    res.json({ success: true, data: evidence });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 6. DIGITAL JOB CHECKLISTS
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.get('/bookings/:id/checklist', async (req, res: Response, next: NextFunction) => {
  try {
    const checklist = await enterpriseService.getServiceChecklist(req.params.id);
    res.json({ success: true, data: checklist });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.put('/bookings/:id/checklist', authenticate, requireRole('PROVIDER', 'ADMIN'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bookingId = req.params.id;
    const completedItems = req.body.completedItems || [];

    let providerId = req.body.providerId;
    if (!providerId && req.user?.id) {
      const pp = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
      providerId = pp?.id;
    }
    if (!providerId) {
      const defaultP = await prisma.providerProfile.findFirst();
      providerId = defaultP?.id || 'pro-verified-1';
    }

    const result = await enterpriseService.updateChecklistExecution(bookingId || '', providerId, completedItems);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 7. SERVICE WARRANTY & REWORK (HOMESERVEX PROTECTION)
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.post('/warranty/claims', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.body.customerId;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id;
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id;
    }

    const { warrantyId, claimReason, evidenceUrls } = req.body;
    if (!warrantyId || !claimReason) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'warrantyId and claimReason are required' } });
      return;
    }

    const claim = await enterpriseService.createWarrantyClaim({
      customerId: customerId || 'demo-customer-1',
      warrantyId,
      claimReason,
      evidenceUrls,
    });

    res.status(201).json({ success: true, data: claim });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/admin/warranty/claims', authenticate, requireRole('ADMIN'), async (_req, res: Response, next: NextFunction) => {
  try {
    const claims = await enterpriseService.getWarrantyClaims();
    res.json({ success: true, data: claims });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.patch('/admin/warranty/claims/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, adminNotes, reworkBookingId } = req.body;
    const result = await enterpriseService.resolveWarrantyClaim(req.params.id || '', status, adminNotes, reworkBookingId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 8. DISPUTES, COMPLAINTS & REFUNDS
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.post('/disputes', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.body.customerId;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id;
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id;
    }

    const { bookingId, disputeType, description, evidenceUrls } = req.body;
    if (!bookingId || !disputeType || !description) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'bookingId, disputeType, and description are required' } });
      return;
    }

    const dispute = await enterpriseService.createDispute({
      bookingId,
      customerId,
      providerId: req.body.providerId,
      disputeType,
      description,
      evidenceUrls,
    });

    res.status(201).json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/disputes', authenticate, async (_req, res: Response, next: NextFunction) => {
  try {
    const disputes = await enterpriseService.getDisputes();
    res.json({ success: true, data: disputes });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.patch('/admin/disputes/:id', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, refundAmountPaise, adminDecision } = req.body;
    const resolvedById = req.user?.id || 'admin-master';

    const result = await enterpriseService.resolveDispute(req.params.id || '', {
      status,
      refundAmountPaise,
      adminDecision,
      resolvedById,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 9. VIDEO CONSULTATION & DIGITAL INSPECTION
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.post('/consultations/request', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let customerId = req.body.customerId;
    if (!customerId && req.user?.id) {
      const cp = await prisma.customerProfile.findUnique({ where: { userId: req.user.id } });
      customerId = cp?.id;
    }
    if (!customerId) {
      const defaultCp = await prisma.customerProfile.findFirst();
      customerId = defaultCp?.id;
    }

    const { serviceId, notes } = req.body;
    const consultation = await enterpriseService.requestConsultation(customerId || 'demo-customer-1', serviceId, notes);
    res.status(201).json({ success: true, data: consultation });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.post('/consultations/:id/quote', authenticate, requireRole('PROVIDER', 'ADMIN'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { quotedAmountPaise, findingsNotes } = req.body;
    const quote = await enterpriseService.submitConsultationQuote(req.params.id || '', quotedAmountPaise, findingsNotes);
    res.json({ success: true, data: quote });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.post('/consultations/:id/accept-quote', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { addressId } = req.body;
    if (!addressId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'addressId is required to generate booking' } });
      return;
    }
    const result = await enterpriseService.acceptConsultationQuote(req.params.id || '', addressId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 10. TRAINING ACADEMY & CERTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.get('/training/courses', async (_req, res: Response, next: NextFunction) => {
  try {
    const courses = await enterpriseService.getTrainingCourses();
    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.post('/training/courses/:id/submit-assessment', authenticate, requireRole('PROVIDER', 'ADMIN'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let providerId = req.body.providerId;
    if (!providerId && req.user?.id) {
      const pp = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
      providerId = pp?.id;
    }
    if (!providerId) {
      const defaultP = await prisma.providerProfile.findFirst();
      providerId = defaultP?.id || 'pro-verified-1';
    }

    const { answers } = req.body;
    const result = await enterpriseService.submitTrainingAssessment(providerId, req.params.id || '', answers || {});
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 11. PROVIDER PERFORMANCE & ROUTE SCHEDULING
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.get('/providers/performance', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let providerId = req.query.providerId as string;
    if (!providerId && req.user?.id) {
      const pp = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
      providerId = pp?.id || '';
    }
    if (!providerId) {
      const defaultP = await prisma.providerProfile.findFirst();
      providerId = defaultP?.id || 'pro-verified-1';
    }

    const performance = await enterpriseService.getProviderPerformance(providerId);
    res.json({ success: true, data: performance });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/providers/schedule-route', authenticate, requireRole('PROVIDER', 'ADMIN'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let providerId = req.query.providerId as string;
    if (!providerId && req.user?.id) {
      const pp = await prisma.providerProfile.findUnique({ where: { userId: req.user.id } });
      providerId = pp?.id || '';
    }
    if (!providerId) {
      const defaultP = await prisma.providerProfile.findFirst();
      providerId = defaultP?.id || 'pro-verified-1';
    }

    const schedule = await enterpriseService.getProviderRouteSchedule(providerId);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 12. SOCIETY & CORPORATE BULK BOOKINGS
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.post('/corporate/organizations', authenticate, requireRole('ADMIN', 'CUSTOMER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await enterpriseService.createCorporateOrganization(req.body);
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.post('/corporate/bookings/bulk', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await enterpriseService.createCorporateBulkBooking({
      ...req.body,
      requestedDate: new Date(req.body.requestedDate || Date.now() + 86400000 * 3),
    });
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 13. AI HOMESERVEX ASSISTANT
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.post('/ai/assistant/chat', async (req, res: Response, next: NextFunction) => {
  try {
    const query = req.body.query || req.body.message || '';
    if (!query) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'query is required' } });
      return;
    }
    const reply = await enterpriseService.processAiCustomerQuery(query);
    res.json({ success: true, data: reply });
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 14. DEMAND INTELLIGENCE & ADVANCED BUSINESS INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════
enterpriseRouter.get('/admin/analytics/demand-forecast', authenticate, requireRole('ADMIN'), async (_req, res: Response, next: NextFunction) => {
  try {
    const forecast = await enterpriseService.getDemandForecast();
    res.json({ success: true, data: forecast });
  } catch (err) {
    next(err);
  }
});

enterpriseRouter.get('/admin/analytics/business-intelligence', authenticate, requireRole('ADMIN'), async (_req, res: Response, next: NextFunction) => {
  try {
    const bi = await enterpriseService.getAdvancedBI();
    res.json({ success: true, data: bi });
  } catch (err) {
    next(err);
  }
});
