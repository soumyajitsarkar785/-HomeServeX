import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { geoDispatch } from '../../lib/geoDispatch.js';
import { config } from '../../config/env.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { providerRegisterSchema, updateProviderLocationSchema } from '@homeservex/validation';
import { activeCustomerOtps, getOrCreateCustomerOtp } from '../bookings/bookings.routes.js';
import { dispatchEngine } from '../../lib/dispatchEngine.js';
import { commissionEngine } from '../../lib/commissionEngine.js';
import { subscriptionEngine } from '../../lib/subscriptionEngine.js';
import { walletLedgerService } from '../../lib/walletLedgerService.js';

export const providerRouter = Router();

function generateTokens(userId: string, role: string, email: string) {
  const accessToken = jwt.sign({ id: userId, role, email }, config.jwtAccessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId, role, email }, config.jwtRefreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// POST /api/v1/providers/register
providerRouter.post('/register', async (req, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = providerRegisterSchema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: body.email }, { phone: body.phone }] } });
    if (existing) {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'User with this email or phone already exists' } });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: 'PROVIDER',
        status: 'PENDING_VERIFICATION',
        providerProfile: {
          create: {
            skills: JSON.stringify(body.skills),
            bio: body.bio,
            verificationStatus: 'PENDING',
          },
        },
      },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email);
    res.status(201).json({
      success: true,
      data: { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status } },
      message: 'Registration successful. Your account is pending verification by our team.',
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// GET /api/v1/providers/profile
providerRouter.get('/profile', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } } },
    });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }
    res.json({ success: true, data: { ...profile, skills: JSON.parse(profile.skills as string) } });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// Handler for provider availability status
async function handleAvailabilityUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body; // ONLINE | OFFLINE
    if (!['ONLINE', 'OFFLINE'].includes(status)) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Status must be ONLINE or OFFLINE' } });
      return;
    }
    const profile = await prisma.providerProfile.update({
      where: { userId: req.user!.id },
      data: { availabilityStatus: status },
    });

    if (status === 'ONLINE') {
      geoDispatch.setAvailability(profile.id, true);
    } else {
      geoDispatch.remove(profile.id);
    }

    res.json({ success: true, data: { availabilityStatus: profile.availabilityStatus } });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

// PUT & PATCH /api/v1/providers/availability
providerRouter.patch('/availability', authenticate, requireRole('PROVIDER'), handleAvailabilityUpdate);
providerRouter.put('/availability', authenticate, requireRole('PROVIDER'), handleAvailabilityUpdate);

// Handler for high-frequency GPS ingestion with H3 cell calculation & adaptive intervals
async function handleLocationUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateProviderLocationSchema.parse(req.body);
    let profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    let skills: string[] = [];
    try {
      skills = profile.skills ? JSON.parse(profile.skills as string) : [];
    } catch {
      skills = [];
    }

    // Ingest into high-frequency geospatial H3 index
    const pingResult = geoDispatch.recordPing({
      providerId: profile.id,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters ?? 5.0,
      speedKmh: body.speedKmh ?? 0.0,
      headingDegrees: body.headingDegrees ?? 0.0,
      skills,
      isAvailable: profile.availabilityStatus === 'ONLINE',
      isBusy: false,
    });

    profile = await prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        currentLatitude: body.latitude,
        currentLongitude: body.longitude,
        currentH3Cell: pingResult.h3Cell,
        currentH3Resolution: 8,
        currentHeading: body.headingDegrees ?? null,
        currentSpeed: body.speedKmh ?? null,
        lastLocationUpdatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        latitude: profile.currentLatitude,
        longitude: profile.currentLongitude,
        h3Cell: pingResult.h3Cell,
        recommendedPingIntervalSec: pingResult.recommendedPingIntervalSec,
      },
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

// PUT & PATCH /api/v1/providers/location (High-Frequency GPS Ingestion)
providerRouter.patch('/location', authenticate, requireRole('PROVIDER'), handleLocationUpdate);
providerRouter.put('/location', authenticate, requireRole('PROVIDER'), handleLocationUpdate);

// GET /api/v1/providers/nearby (Geospatial Nearby Search)
providerRouter.get('/nearby', async (req, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string || '19.0760');
    const lng = parseFloat(req.query.lng as string || '72.8777');
    const radiusKm = parseFloat(req.query.radiusKm as string || '10');
    const skill = req.query.skill as string | undefined;

    const nearby = geoDispatch.searchNearbyProviders(lat, lng, radiusKm, skill);
    res.json({ success: true, data: nearby });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// GET /api/v1/providers/bookings (assigned bookings)
providerRouter.get('/bookings', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { assignedProviderId: profile.id },
          { status: 'PENDING', assignedProviderId: null },
        ],
      },
      include: {
        service: { include: { category: true } },
        address: true,
      },
      orderBy: { scheduledSlot: 'asc' },
    });
    res.json({ success: true, data: bookings });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// Handler for atomic booking offer acceptance
async function handleAcceptBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = (req.params.offerId || req.params.id || '').trim();
    if (!bookingId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Booking or offer ID is required' } });
      return;
    }
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) {
      profile = await prisma.providerProfile.findFirst();
    }
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const coords = (req.body.latitude && req.body.longitude)
      ? { latitude: Number(req.body.latitude), longitude: Number(req.body.longitude) }
      : (profile.currentLatitude && profile.currentLongitude)
      ? { latitude: profile.currentLatitude, longitude: profile.currentLongitude }
      : undefined;

    const result = await dispatchEngine.handleProviderAccept(bookingId, profile.id, coords);

    // Remove from available geo pool during active service
    geoDispatch.setAvailability(profile.id, false);

    res.json({ success: true, data: result.booking, message: result.message || 'Booking accepted successfully!' });
    return;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('CONFLICT:')) {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message.replace('CONFLICT:', '').trim() } });
      return;
    }
    if (err instanceof Error && err.message.startsWith('NOT_FOUND:')) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message.replace('NOT_FOUND:', '').trim() } });
      return;
    }
    if (err instanceof Error && err.message.startsWith('OUT_OF_RADIUS:')) {
      res.status(403).json({ success: false, error: { code: 'OUT_OF_RADIUS', message: err.message.replace('OUT_OF_RADIUS:', '').trim() } });
      return;
    }
    next(err);
    return;
  }
}

// POST & PATCH /api/v1/providers/offers/:offerId/accept
providerRouter.patch('/bookings/:id/accept', authenticate, requireRole('PROVIDER'), handleAcceptBooking);
providerRouter.post('/bookings/:id/accept', authenticate, requireRole('PROVIDER'), handleAcceptBooking);
providerRouter.post('/offers/:offerId/accept', authenticate, requireRole('PROVIDER'), handleAcceptBooking);

// POST /api/v1/providers/offers/:offerId/reject
providerRouter.post('/offers/:offerId/reject', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = (req.params.offerId || req.params.id || '').trim();
    if (!bookingId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Booking or offer ID is required' } });
      return;
    }
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) {
      profile = await prisma.providerProfile.findFirst();
    }
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const reason = req.body.reason || 'Declined by provider';
    await dispatchEngine.handleProviderReject(bookingId, profile.id, reason);

    // Re-enable provider in dispatch pool
    geoDispatch.setAvailability(profile.id, true);

    res.json({ success: true, message: `Offer for booking ${bookingId} declined. Searching for next request.` });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// GET /api/v1/providers/offers & GET /api/v1/providers/offers/pending — Active pending offers with persistent recovery
async function handleGetPendingOffers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) {
      profile = await prisma.providerProfile.findFirst();
    }
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    // 1. In-memory active dispatches
    const liveOffers = dispatchEngine.getProviderActiveOffers(profile.id);

    // 2. Persistent database offers
    const dbAssignments = await prisma.bookingAssignment.findMany({
      where: {
        providerId: profile.id,
        status: 'OFFERED',
        expiresAt: { gt: new Date() },
      },
      include: {
        booking: {
          include: {
            service: { include: { category: true } },
            address: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Merge and deduplicate by bookingId
    const offerMap = new Map<string, any>();

    for (const off of liveOffers) {
      offerMap.set(off.bookingId, {
        offerId: off.id,
        bookingId: off.bookingId,
        providerId: off.providerId,
        status: off.status,
        distanceKm: off.distanceKm,
        stage: off.stage,
        radiusKm: off.radiusKm,
        expiresAt: new Date(off.expiresAt).toISOString(),
        secondsRemaining: Math.max(0, Math.round((off.expiresAt - Date.now()) / 1000)),
      });
    }

    for (const a of dbAssignments as any[]) {
      if (!offerMap.has(a.bookingId)) {
        const expMs = a.expiresAt ? a.expiresAt.getTime() : Date.now() + 45000;
        offerMap.set(a.bookingId, {
          offerId: a.offerId || a.id,
          bookingId: a.bookingId,
          providerId: a.providerId,
          status: a.status,
          distanceKm: a.distanceKm ?? 2.5,
          stage: a.stage ?? 1,
          radiusKm: 5,
          expiresAt: a.expiresAt ? a.expiresAt.toISOString() : new Date(expMs).toISOString(),
          secondsRemaining: Math.max(0, Math.round((expMs - Date.now()) / 1000)),
          booking: a.booking ? {
            referenceNumber: a.booking.referenceNumber,
            service: a.booking.service?.name,
            priceRupees: Math.round(a.booking.totalAmountPaise / 100),
            address: a.booking.address?.streetAddress || 'Doorstep Service',
          } : undefined,
        });
      }
    }

    res.json({ success: true, data: Array.from(offerMap.values()) });
    return;
  } catch (err) {
    next(err);
  }
}

providerRouter.get('/offers/pending', authenticate, requireRole('PROVIDER'), handleGetPendingOffers);
providerRouter.get('/offers', authenticate, requireRole('PROVIDER'), handleGetPendingOffers);

// PATCH /api/v1/providers/bookings/:id/status (e.g. PROVIDER_EN_ROUTE, ARRIVED)
providerRouter.patch('/bookings/:id/status', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    if (!['PROVIDER_EN_ROUTE', 'ARRIVED'].includes(status)) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid status transition' } });
      return;
    }
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status, updatedAt: new Date() },
      include: { service: true, address: true },
    });
    res.json({ success: true, data: updated });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// POST /api/v1/providers/bookings/:id/verify-start — Two-Phase Handshake Step 1
providerRouter.post('/bookings/:id/verify-start', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = req.params.id;
    if (!bookingId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Booking ID is required' } });
      return;
    }
    const otpCode = (req.body.otpCode || req.body.otp || '').trim();

    if (!otpCode || otpCode.length < 4 || otpCode.length > 6) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'A 4 to 6-digit Start OTP is required' } });
      return;
    }

    const otpRecord = await prisma.bookingOtp.findFirst({
      where: { bookingId, purpose: 'START_SERVICE', isConsumed: false },
    });

    if (!otpRecord) {
      res.status(404).json({ success: false, error: { code: 'OTP_NOT_FOUND', message: 'No active Start OTP found for this booking' } });
      return;
    }

    if (new Date() > otpRecord.expiresAt) {
      res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'Start OTP has expired. Ask customer to refresh.' } });
      return;
    }

    if (otpRecord.attemptCount >= otpRecord.maxAttempts) {
      res.status(429).json({ success: false, error: { code: 'OTP_MAX_ATTEMPTS', message: 'Maximum OTP attempts exceeded for security' } });
      return;
    }

    const isValid = await bcrypt.compare(otpCode, otpRecord.otpHash);
    await prisma.bookingOtp.update({ where: { id: otpRecord.id }, data: { attemptCount: { increment: 1 } } });

    if (!isValid) {
      res.status(400).json({ success: false, error: { code: 'OTP_INVALID', message: 'Incorrect Start OTP. Please confirm with the customer.' } });
      return;
    }

    // Mark Start OTP consumed and purge from memory
    await prisma.bookingOtp.update({ where: { id: otpRecord.id }, data: { isConsumed: true } });
    activeCustomerOtps.delete(`${bookingId}_START_SERVICE`);

    // Transition booking to IN_PROGRESS
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'IN_PROGRESS', updatedAt: new Date() },
    });

    // Step 2 Preparation: Generate random Completion OTP (held exclusively on Customer App)
    await getOrCreateCustomerOtp(bookingId, 'COMPLETE_SERVICE');

    res.json({
      success: true,
      data: { bookingId, status: updated.status },
      message: 'Service commenced successfully! Completion OTP has been issued to the customer.',
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// POST /api/v1/providers/bookings/:id/verify-complete — Two-Phase Handshake Step 2 & Settlement
providerRouter.post('/bookings/:id/verify-complete', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = req.params.id;
    if (!bookingId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Booking ID is required' } });
      return;
    }
    const otpCode = (req.body.otpCode || req.body.otp || '').trim();

    if (!otpCode || otpCode.length < 4 || otpCode.length > 6) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'A 4 to 6-digit Completion OTP is required' } });
      return;
    }

    const otpRecord = await prisma.bookingOtp.findFirst({
      where: { bookingId, purpose: 'COMPLETE_SERVICE', isConsumed: false },
    });

    if (!otpRecord) {
      res.status(404).json({ success: false, error: { code: 'OTP_NOT_FOUND', message: 'No active Completion OTP found for this booking' } });
      return;
    }

    if (new Date() > otpRecord.expiresAt) {
      res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'Completion OTP has expired.' } });
      return;
    }

    if (otpRecord.attemptCount >= otpRecord.maxAttempts) {
      res.status(429).json({ success: false, error: { code: 'OTP_MAX_ATTEMPTS', message: 'Maximum OTP verification attempts exceeded' } });
      return;
    }

    const isValid = await bcrypt.compare(otpCode, otpRecord.otpHash);
    await prisma.bookingOtp.update({ where: { id: otpRecord.id }, data: { attemptCount: { increment: 1 } } });

    if (!isValid) {
      res.status(400).json({ success: false, error: { code: 'OTP_INVALID', message: 'Incorrect Completion OTP. Please ask customer to provide the sign-off code.' } });
      return;
    }

    // Mark Completion OTP consumed
    await prisma.bookingOtp.update({ where: { id: otpRecord.id }, data: { isConsumed: true } });
    activeCustomerOtps.delete(`${bookingId}_COMPLETE_SERVICE`);

    // Fetch provider profile
    let profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      profile = await prisma.providerProfile.findFirst();
    }
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    // Atomic Financial Settlement via Centralized CommissionEngine
    // Evaluates provider's active subscription (0% commission for Premium, 15% for Normal),
    // updates booking, credits provider wallet, records immutable snapshot and balanced ledger entries
    const settlement = await commissionEngine.settleCompletedBooking(bookingId, profile.id);

    // Update provider completed jobs count and re-enable in dispatch pool
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { completedJobsCount: { increment: 1 } },
    });
    geoDispatch.setAvailability(profile.id, true);

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'COMPLETED',
        financialSettlement: {
          grossTotalPaise: settlement.snapshot.serviceGrossPaise,
          grossTotalRupees: settlement.snapshot.serviceGrossPaise / 100,
          commissionRatePercent: settlement.snapshot.commissionRatePercent,
          platformCommissionPaise: settlement.commissionPaise,
          platformCommissionRupees: settlement.commissionPaise / 100,
          providerNetEarningsPaise: settlement.providerEarningsPaise,
          providerNetEarningsRupees: settlement.providerEarningsPaise / 100,
          walletBalanceRupees: settlement.walletBalancePaise / 100,
          membershipType: settlement.snapshot.membershipType,
        },
      },
      message: settlement.snapshot.membershipType === 'PREMIUM'
        ? 'Service verified! 0% Platform Commission applied (Premium Member). 100% earnings credited to your wallet.'
        : 'Service verified! Earnings credited to your wallet after 15% platform fee.',
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// GET /api/v1/providers/wallet/summary & /api/v1/providers/earnings
async function handleWalletSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) {
      profile = await prisma.providerProfile.findFirst();
    }
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const summary = await walletLedgerService.getProviderWalletSummary(profile.id);
    res.json({
      success: true,
      data: {
        ...summary,
        totalEarningsPaise: summary.totalEarnedPaise,
        walletBalancePaise: summary.balancePaise,
        walletBalanceRupees: summary.balanceRupees,
        totalGrossRupees: summary.totalEarnedRupees,
        totalCommissionDeductedRupees: summary.totalCommissionPaidRupees,
        payoutEligibility: summary.isPayoutEligible ? 'ELIGIBLE' : `MINIMUM_₹${summary.minimumPayoutRupees}_REQUIRED`,
        ledger: summary.recentTransactions,
      },
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

providerRouter.get('/wallet/summary', authenticate, requireRole('PROVIDER'), handleWalletSummary);
providerRouter.get('/wallet/ledger', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) profile = await prisma.providerProfile.findFirst();
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const ledger = await walletLedgerService.getProviderLedger(profile.id, page, limit);

    res.json({ success: true, ...ledger });
    return;
  } catch (err) {
    next(err);
    return;
  }
});
providerRouter.get('/earnings', authenticate, requireRole('PROVIDER'), handleWalletSummary);

// POST /api/v1/providers/wallet/payout (Withdrawal Request)
providerRouter.post('/wallet/payout', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) profile = await prisma.providerProfile.findFirst();
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const { amountRupees, upiId, bankName, accountNumber, ifsc } = req.body;
    if (!amountRupees || typeof amountRupees !== 'number' || amountRupees < 500) {
      res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Minimum withdrawal amount is ₹500' } });
      return;
    }

    const payout = await walletLedgerService.requestPayout(profile.id, amountRupees, {
      upiId,
      bankName,
      accountNumber,
      ifsc,
    });

    res.status(201).json({
      success: true,
      data: payout,
      message: `Withdrawal request #${payout.referenceNumber} for ₹${amountRupees} submitted successfully. Processing via direct settlement.`,
    });
    return;
  } catch (err: any) {
    if (err?.message?.includes('Insufficient')) {
      res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_FUNDS', message: err.message } });
      return;
    }
    next(err);
    return;
  }
});

// GET /api/v1/providers/wallet/payouts (Payout History)
providerRouter.get('/wallet/payouts', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) profile = await prisma.providerProfile.findFirst();
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const payouts = await prisma.providerPayout.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: payouts.map((p) => ({
        ...p,
        amountRupees: p.amountPaise / 100,
      })),
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// ── SUBSCRIPTION SYSTEM ENDPOINTS ──

// GET /api/v1/providers/subscription/status
providerRouter.get('/subscription/status', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) profile = await prisma.providerProfile.findFirst();
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    // Trigger auto-expiry check
    await subscriptionEngine.processSubscriptionExpirations();

    const status = await subscriptionEngine.getProviderSubscriptionStatus(profile.id);
    res.json({ success: true, data: status });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// GET /api/v1/providers/subscription/plans
providerRouter.get('/subscription/plans', async (_req, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plans = await subscriptionEngine.listPlans();
    res.json({ success: true, data: plans });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// POST /api/v1/providers/subscription/order (Purchase Intent)
providerRouter.post('/subscription/order', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let profile = req.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: req.user.id } }) : null;
    if (!profile) profile = await prisma.providerProfile.findFirst();
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const { planSlug, paymentMethod } = req.body;
    if (!planSlug) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'planSlug is required' } });
      return;
    }

    const order = await subscriptionEngine.createSubscriptionPaymentOrder(profile.id, planSlug, paymentMethod || 'ONLINE_UPI');
    res.status(201).json({ success: true, data: order, message: `Payment order created for ${order.planName}` });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// POST /api/v1/providers/subscription/verify (Payment Signature & Activation)
providerRouter.post('/subscription/verify', authenticate, requireRole('PROVIDER'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;
    if (!gatewayOrderId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'gatewayOrderId is required' } });
      return;
    }

    const activation = await subscriptionEngine.verifyAndActivateSubscription(gatewayOrderId, gatewayPaymentId, gatewaySignature);
    res.json({ success: true, data: activation, message: activation.message });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

