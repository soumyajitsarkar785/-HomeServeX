import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { geoDispatch } from '../../lib/geoDispatch.js';
import { config } from '../../config/env.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { providerRegisterSchema, updateProviderLocationSchema } from '@homeservex/validation';
import { activeCustomerOtps } from '../bookings/bookings.routes.js';

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

// Handler for high-frequency GPS ingestion
async function handleLocationUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateProviderLocationSchema.parse(req.body);
    const profile = await prisma.providerProfile.update({
      where: { userId: req.user!.id },
      data: { currentLatitude: body.latitude, currentLongitude: body.longitude, lastLocationUpdatedAt: new Date() },
    });

    let skills: string[] = [];
    try {
      skills = profile.skills ? JSON.parse(profile.skills as string) : [];
    } catch {
      skills = [];
    }

    // Ingest into high-frequency geospatial index with 60-second TTL
    geoDispatch.recordPing(profile.id, body.latitude, body.longitude, skills);

    res.json({ success: true, data: { latitude: profile.currentLatitude, longitude: profile.currentLongitude } });
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
    const bookingId = req.params.offerId || req.params.id;
    const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    // Atomic transaction lock
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!current) {
        throw new Error('NOT_FOUND:Booking record does not exist');
      }
      if (current.status !== 'PENDING' && current.status !== 'SEARCHING_PROVIDER') {
        throw new Error('CONFLICT:This booking is no longer available or was accepted by another partner');
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'ASSIGNED',
          assignedProviderId: profile.id,
          updatedAt: new Date(),
        },
        include: { service: true, address: true },
      });
    });

    // Remove from available geo pool during active service
    geoDispatch.setAvailability(profile.id, false);

    res.json({ success: true, data: updated, message: 'Booking accepted successfully!' });
    return;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('CONFLICT:')) {
      res.status(409).json({ success: false, error: { code: 'CONFLICT', message: err.message.replace('CONFLICT:', '') } });
      return;
    }
    if (err instanceof Error && err.message.startsWith('NOT_FOUND:')) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message.replace('NOT_FOUND:', '') } });
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
    const bookingId = req.params.offerId || req.params.id;
    const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    // Re-enable provider in dispatch pool
    geoDispatch.setAvailability(profile.id, true);

    res.json({ success: true, message: `Offer for booking ${bookingId} declined. Searching for next request.` });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

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

    if (!otpCode || otpCode.length !== 6) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'A 6-digit Start OTP is required' } });
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

    // Step 2 Preparation: Generate Completion OTP (held exclusively on Customer App)
    const completionOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const completionHash = await bcrypt.hash(completionOtp, 10);
    const completionExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours window
    await prisma.bookingOtp.create({
      data: { bookingId, purpose: 'COMPLETE_SERVICE', otpHash: completionHash, expiresAt: completionExpiresAt },
    });
    activeCustomerOtps.set(`${bookingId}_COMPLETE_SERVICE`, { otp: completionOtp, purpose: 'COMPLETE_SERVICE', expiresAt: completionExpiresAt });

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

    if (!otpCode || otpCode.length !== 6) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'A 6-digit Completion OTP is required' } });
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

    // Transition booking to COMPLETED and update provider job stats
    const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'COMPLETED', paymentStatus: 'PAID', updatedAt: new Date() },
    });

    if (profile) {
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { completedJobsCount: { increment: 1 } },
      });
      // Re-enable provider in dispatch pool
      geoDispatch.setAvailability(profile.id, true);
    }

    res.json({
      success: true,
      data: {
        bookingId,
        status: updated.status,
        financialSettlement: {
          grossTotalPaise: updated.totalAmountPaise,
          grossTotalRupees: updated.totalAmountPaise / 100,
          platformCommissionPaise: updated.commissionAmountPaise,
          platformCommissionRupees: updated.commissionAmountPaise / 100,
          providerNetEarningsPaise: updated.providerEarningsPaise,
          providerNetEarningsRupees: updated.providerEarningsPaise / 100,
        },
      },
      message: 'Service completed and verified! Earnings credited to your wallet.',
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
});

// GET /api/v1/providers/wallet/ledger & GET /api/v1/providers/earnings
async function handleWalletLedger(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Provider profile not found' } });
      return;
    }

    const completedBookings = await prisma.booking.findMany({
      where: { assignedProviderId: profile.id, status: 'COMPLETED' },
      include: { service: { select: { name: true } }, address: { select: { city: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const totalGrossPaise = completedBookings.reduce((sum, b) => sum + b.totalAmountPaise, 0);
    const totalCommissionPaise = completedBookings.reduce((sum, b) => sum + b.commissionAmountPaise, 0);
    const totalEarningsPaise = completedBookings.reduce((sum, b) => sum + b.providerEarningsPaise, 0);

    // Double-entry accounting ledger entries
    const ledgerEntries = completedBookings.map(b => ({
      transactionId: `TXN-${b.referenceNumber}`,
      bookingReference: b.referenceNumber,
      serviceName: b.service.name,
      completedAt: b.updatedAt.toISOString(),
      entries: [
        { account: 'Accounts Receivable (Customer)', type: 'DEBIT', amountPaise: b.totalAmountPaise },
        { account: 'Platform Commission Revenue (10%)', type: 'CREDIT', amountPaise: b.commissionAmountPaise },
        { account: 'Provider Payable Wallet (90%)', type: 'CREDIT', amountPaise: b.providerEarningsPaise },
      ],
      netCreditPaise: b.providerEarningsPaise,
      netCreditRupees: b.providerEarningsPaise / 100,
    }));

    res.json({
      success: true,
      data: {
        totalEarningsPaise,
        walletBalancePaise: totalEarningsPaise,
        walletBalanceRupees: totalEarningsPaise / 100,
        totalGrossPaise,
        totalGrossRupees: totalGrossPaise / 100,
        totalCommissionDeductedPaise: totalCommissionPaise,
        totalCommissionDeductedRupees: totalCommissionPaise / 100,
        completedJobsCount: completedBookings.length,
        ratingAverage: profile.ratingAverage,
        totalRatingsCount: profile.totalRatingsCount,
        payoutEligibility: totalEarningsPaise >= 50000 ? 'ELIGIBLE' : 'MINIMUM_₹500_REQUIRED',
        ledger: ledgerEntries,
      },
    });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

providerRouter.get('/wallet/ledger', authenticate, requireRole('PROVIDER'), handleWalletLedger);
providerRouter.get('/earnings', authenticate, requireRole('PROVIDER'), handleWalletLedger);

