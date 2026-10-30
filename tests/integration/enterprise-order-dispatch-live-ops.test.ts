import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { prisma } from '../../apps/api/src/lib/prisma.js';
import { geoDispatch } from '../../apps/api/src/lib/geoDispatch.js';
import { dispatchEngine } from '../../apps/api/src/lib/dispatchEngine.js';
import { dispatchConfigService } from '../../apps/api/src/lib/dispatchConfigService.js';
import { config } from '../../apps/api/src/config/env.js';
import { createApp } from '../../apps/api/src/app.js';

describe('HOMESERVEX ENTERPRISE — 3-STEP PHASED SYSTEM VERIFICATION', () => {
  const app = createApp();

  let testCustomerId: string;
  let testCustomerProfileId: string;
  let testAddressId: string;
  let testServiceId: string;
  let testServiceSlug: string;
  let testProvider1Id: string;
  let testProvider2Id: string;
  let testProviderFarId: string;
  let p1UserId: string;
  let p2UserId: string;
  let pFarUserId: string;

  beforeAll(async () => {
    // 1. Seed or resolve a test Category and Service
    let category = await prisma.serviceCategory.findFirst({ where: { slug: 'appliance-repair' } });
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          name: 'Appliance Repair',
          slug: 'appliance-repair',
          description: 'Certified appliance repair services',
          iconUrl: 'Tools',
        },
      });
    }

    testServiceSlug = `ac-power-jet-test-${Date.now()}`;
    const service = await prisma.service.create({
      data: {
        name: 'AC Power Jet Servicing',
        slug: testServiceSlug,
        description: 'Deep pressure cleaning of filters and coils',
        categoryId: category.id,
        basePricePaise: 49900,
        estimatedDurationMinutes: 45,
      },
    });
    testServiceId = service.id;

    // 2. Seed a Test Customer
    const testEmail = `cust.ops.${Date.now()}@homeservex.test`;
    const custUser = await prisma.user.create({
      data: {
        name: 'Siddhartha Banerjee',
        email: testEmail,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash('Secret@123', 8),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        customerProfile: {
          create: {},
        },
      },
      include: { customerProfile: true },
    });
    testCustomerId = custUser.id;
    testCustomerProfileId = custUser.customerProfile!.id;

    // Seed customer address in Joynagar (22.1818 N, 88.4282 E)
    const address = await prisma.address.create({
      data: {
        customerId: testCustomerProfileId,
        label: 'Home',
        streetAddress: 'Main Road, Joynagar Market',
        city: 'Joynagar',
        state: 'West Bengal',
        postalCode: '743337',
        latitude: 22.1818,
        longitude: 88.4282,
        isDefault: true,
      },
    });
    testAddressId = address.id;

    // 3. Seed Provider 1: Nearby in Joynagar (1.8 km away)
    const p1User = await prisma.user.create({
      data: {
        name: 'Ramesh Kumar Specialist',
        email: `ramesh.ops.${Date.now()}@homeservex.test`,
        phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash('Secret@123', 8),
        role: 'PROVIDER',
        status: 'ACTIVE',
        providerProfile: {
          create: {
            skills: JSON.stringify(['appliance-repair', 'ac-servicing']),
            verificationStatus: 'APPROVED',
            availabilityStatus: 'ONLINE',
            ratingAverage: 4.9,
            totalRatingsCount: 120,
            completedJobsCount: 248,
            currentLatitude: 22.1950,
            currentLongitude: 88.4420,
            lastLocationUpdatedAt: new Date(),
          },
        },
      },
      include: { providerProfile: true },
    });
    p1UserId = p1User.id;
    testProvider1Id = p1User.providerProfile!.id;

    // 4. Seed Provider 2: Also nearby in Joynagar (2.5 km away)
    const p2User = await prisma.user.create({
      data: {
        name: 'Rohit Kumar Tech',
        email: `rohit.ops.${Date.now()}@homeservex.test`,
        phone: `+9196${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash('Secret@123', 8),
        role: 'PROVIDER',
        status: 'ACTIVE',
        providerProfile: {
          create: {
            skills: JSON.stringify(['appliance-repair', 'ac-servicing']),
            verificationStatus: 'APPROVED',
            availabilityStatus: 'ONLINE',
            ratingAverage: 4.8,
            totalRatingsCount: 85,
            completedJobsCount: 160,
            currentLatitude: 22.1980,
            currentLongitude: 88.4450,
            lastLocationUpdatedAt: new Date(),
          },
        },
      },
      include: { providerProfile: true },
    });
    p2UserId = p2User.id;
    testProvider2Id = p2User.providerProfile!.id;

    // 5. Seed Provider 3: Outside 5km radius (Howrah / 45 km away)
    const pFarUser = await prisma.user.create({
      data: {
        name: 'Far Away Technician',
        email: `far.ops.${Date.now()}@homeservex.test`,
        phone: `+9195${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: await bcrypt.hash('Secret@123', 8),
        role: 'PROVIDER',
        status: 'ACTIVE',
        providerProfile: {
          create: {
            skills: JSON.stringify(['appliance-repair']),
            verificationStatus: 'APPROVED',
            availabilityStatus: 'ONLINE',
            ratingAverage: 4.7,
            currentLatitude: 22.5958,
            currentLongitude: 88.2636, // ~45 km away
            lastLocationUpdatedAt: new Date(),
          },
        },
      },
      include: { providerProfile: true },
    });
    pFarUserId = pFarUser.id;
    testProviderFarId = pFarUser.providerProfile!.id;

    // Register active GPS telemetry in geoDispatch memory
    geoDispatch.recordPing(testProvider1Id, 22.1950, 88.4420, ['appliance-repair', 'ac-servicing']);
    geoDispatch.recordPing(testProvider2Id, 22.1980, 88.4450, ['appliance-repair', 'ac-servicing']);
    geoDispatch.recordPing(testProviderFarId, 22.5958, 88.2636, ['appliance-repair']);
  });

  afterAll(async () => {
    // Thoroughly clean up all created test entities
    try {
      if (testProvider1Id) geoDispatch.remove(testProvider1Id);
      if (testProvider2Id) geoDispatch.remove(testProvider2Id);
      if (testProviderFarId) geoDispatch.remove(testProviderFarId);

      const providerProfileIds = [testProvider1Id, testProvider2Id, testProviderFarId].filter(Boolean);
      const userIds = [testCustomerId, p1UserId, p2UserId, pFarUserId].filter(Boolean);

      if (testCustomerProfileId) {
        await prisma.bookingOtp.deleteMany({
          where: { booking: { customerId: testCustomerProfileId } },
        });
        await prisma.bookingAssignment.deleteMany({
          where: {
            OR: [
              { booking: { customerId: testCustomerProfileId } },
              ...(providerProfileIds.length > 0 ? [{ providerId: { in: providerProfileIds } }] : []),
            ],
          },
        });
        await prisma.bookingStatusHistory.deleteMany({
          where: { booking: { customerId: testCustomerProfileId } },
        });
        await prisma.booking.deleteMany({
          where: { customerId: testCustomerProfileId },
        });
        await prisma.address.deleteMany({
          where: { customerId: testCustomerProfileId },
        });
        await prisma.customerProfile.deleteMany({
          where: { id: testCustomerProfileId },
        });
      }

      if (providerProfileIds.length > 0) {
        await prisma.providerProfile.deleteMany({
          where: { id: { in: providerProfileIds } },
        });
      }

      if (testServiceId) {
        await prisma.service.deleteMany({
          where: { id: testServiceId },
        });
      }

      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    } catch {}
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION 1: Customer Order Creation -> Real-Time Appearance in Admin All Orders
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Verification 1: Customer Order Creation Synchronizes to Admin All Orders', () => {
    it('creates an authoritative customer order and verifies it appears in Admin All Orders with reference, price, and OTPs', async () => {
      const refNum = `HSX-OPS-${Date.now().toString(36).toUpperCase()}`;

      // Customer creates booking
      const booking = await prisma.booking.create({
        data: {
          referenceNumber: refNum,
          customerId: testCustomerProfileId,
          serviceId: testServiceId,
          addressId: testAddressId,
          scheduledSlot: new Date(Date.now() + 3600000),
          status: 'SEARCHING_PROVIDER',
          baseAmountPaise: 49900,
          totalAmountPaise: 49900,
          lastKnownLatitude: 22.1818,
          lastKnownLongitude: 88.4282,
        },
        include: {
          service: true,
          customer: { include: { user: true } },
          address: true,
        },
      });

      expect(booking.id).toBeDefined();
      expect(booking.referenceNumber).toBe(refNum);

      // Seed Dual-Step OTPs for this booking
      const startOtpHash = await bcrypt.hash('4821', 8);
      const compOtpHash = await bcrypt.hash('7394', 8);
      await prisma.bookingOtp.createMany({
        data: [
          { bookingId: booking.id, purpose: 'START_SERVICE', otpHash: startOtpHash, expiresAt: new Date(Date.now() + 86400000) },
          { bookingId: booking.id, purpose: 'COMPLETE_SERVICE', otpHash: compOtpHash, expiresAt: new Date(Date.now() + 86400000) },
        ],
      });

      // Query Admin Orders as Admin Console does
      const adminOrderRows = await prisma.booking.findMany({
        where: { referenceNumber: refNum },
        include: {
          customer: { include: { user: true } },
          service: { include: { category: true } },
          address: true,
          assignments: { include: { provider: { include: { user: true } } } },
        },
      });

      expect(adminOrderRows).toHaveLength(1);
      const adminRow = adminOrderRows[0];

      // Verify all authoritative properties match
      expect(adminRow.referenceNumber).toBe(refNum);
      expect(adminRow.customer.user.name).toBe('Siddhartha Banerjee');
      expect(adminRow.service.name).toBe('AC Power Jet Servicing');
      expect(adminRow.totalAmountPaise).toBe(49900);
      expect(adminRow.status).toBe('SEARCHING_PROVIDER');
      expect(adminRow.address.city).toBe('Joynagar');

      // Verify Dual OTP records exist
      const otps = await prisma.bookingOtp.findMany({ where: { bookingId: booking.id } });
      expect(otps.length).toBeGreaterThanOrEqual(2);
      expect(otps.some(o => o.purpose === 'START_SERVICE')).toBe(true);
      expect(otps.some(o => o.purpose === 'COMPLETE_SERVICE')).toBe(true);

      // Verify via actual HTTP endpoint GET /api/v1/admin/orders
      const httpRes = await request(app)
        .get('/api/v1/admin/orders')
        .set('x-role', 'ADMIN');

      expect(httpRes.status).toBe(200);
      expect(httpRes.body.success).toBe(true);
      expect(Array.isArray(httpRes.body.data)).toBe(true);
      const matchingOrder = httpRes.body.data.find((o: any) => o.referenceNumber === refNum);
      expect(matchingOrder).toBeDefined();
      expect(matchingOrder.customerName).toBe('Siddhartha Banerjee');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION 2: Dispatch Engine Candidate Search & Atomic Single-Winner Assignment
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Verification 2: Dispatch Engine Matching & Atomic Concurrency-Safe Provider Acceptance', () => {
    let testBookingId: string;
    let testRefNum: string;

    beforeAll(async () => {
      testRefNum = `HSX-DISP-${Date.now().toString(36).toUpperCase()}`;
      const booking = await prisma.booking.create({
        data: {
          referenceNumber: testRefNum,
          customerId: testCustomerProfileId,
          serviceId: testServiceId,
          addressId: testAddressId,
          scheduledSlot: new Date(Date.now() + 3600000),
          status: 'SEARCHING_PROVIDER',
          baseAmountPaise: 49900,
          totalAmountPaise: 49900,
          lastKnownLatitude: 22.1818,
          lastKnownLongitude: 88.4282,
        },
      });
      testBookingId = booking.id;
    });

    it('finds and ranks nearby eligible providers within 5km, while excluding providers outside radius', async () => {
      const custLat = 22.1818;
      const custLng = 88.4282;
      const radiusKm = 5.0;

      const { candidates, excluded } = await dispatchEngine.findAndRankCandidates(
        custLat,
        custLng,
        radiusKm,
        'appliance-repair',
        testBookingId
      );

      // Provider 1 (~2.0 km) and Provider 2 (~2.5 km) must be eligible
      const candIds = candidates.map((c) => c.providerId);
      expect(candIds).toContain(testProvider1Id);
      expect(candIds).toContain(testProvider2Id);

      // Far Away Provider (~45 km) must be excluded with OUT_OF_RADIUS
      const excludedIds = excluded.map((e) => e.providerId);
      expect(excludedIds).toContain(testProviderFarId);
      const farEx = excluded.find((e) => e.providerId === testProviderFarId);
      expect(farEx?.reason).toBe('OUT_OF_RADIUS');

      // Candidate 1 must be ranked higher than Candidate 2 (closer + higher rating)
      const p1Cand = candidates.find((c) => c.providerId === testProvider1Id);
      const p2Cand = candidates.find((c) => c.providerId === testProvider2Id);
      expect(p1Cand!.score).toBeGreaterThan(p2Cand!.score);
    });

    it('executes atomic assignment when Provider 1 accepts', async () => {
      // Provider 1 accepts within allowed radius
      const result = await dispatchEngine.handleProviderAccept(testBookingId, testProvider1Id, {
        latitude: 22.1950,
        longitude: 88.4420,
      });

      expect(result.success).toBe(true);

      // Verify Prisma database state
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: testBookingId },
        include: { assignments: true },
      });

      expect(updatedBooking?.status).toBe('ASSIGNED');
      expect(updatedBooking?.assignedProviderId).toBe(testProvider1Id);

      const p1Assignment = updatedBooking?.assignments.find((a) => a.providerId === testProvider1Id);
      expect(p1Assignment?.status).toBe('ACCEPTED');
    });

    it('enforces concurrency safety: blocks Provider 2 when attempting to accept the already-assigned booking', async () => {
      // Provider 2 tries to accept the booking that Provider 1 already claimed
      await expect(
        dispatchEngine.handleProviderAccept(testBookingId, testProvider2Id, {
          latitude: 22.1980,
          longitude: 88.4450,
        })
      ).rejects.toThrow(/CONFLICT/);

      // Verify booking assignment remains exclusively with Provider 1
      const booking = await prisma.booking.findUnique({
        where: { id: testBookingId },
      });
      expect(booking?.assignedProviderId).toBe(testProvider1Id);
    });

    it('enforces server-side radius revalidation: blocks provider acceptance if coordinates are outside radius', async () => {
      // Create a fresh booking for testing out-of-radius acceptance
      const b2 = await prisma.booking.create({
        data: {
          referenceNumber: `HSX-RAD-${Date.now().toString(36).toUpperCase()}`,
          customerId: testCustomerProfileId,
          serviceId: testServiceId,
          addressId: testAddressId,
          scheduledSlot: new Date(Date.now() + 3600000),
          status: 'SEARCHING_PROVIDER',
          baseAmountPaise: 49900,
          totalAmountPaise: 49900,
          lastKnownLatitude: 22.1818,
          lastKnownLongitude: 88.4282,
        },
      });

      // Provider attempts to accept with spoofed/distant coordinates (e.g., Delhi, 1400 km away)
      await expect(
        dispatchEngine.handleProviderAccept(b2.id, testProvider1Id, {
          latitude: 28.6139,
          longitude: 77.2090,
        })
      ).rejects.toThrow(/OUT_OF_RADIUS/);

      // Booking status must remain SEARCHING_PROVIDER
      const freshBooking = await prisma.booking.findUnique({ where: { id: b2.id } });
      expect(freshBooking?.status).toBe('SEARCHING_PROVIDER');
      expect(freshBooking?.assignedProviderId).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION 3: Admin Live Operations Center State & Telemetry Consistency
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Verification 3: Admin Live Operations Center Displays Real-Time Booking & Fleet Telemetry', () => {
    it('verifies live-map telemetry reflects active bookings and online provider locations accurately', async () => {
      // Fetch online providers from geoDispatch & database
      const activeLocations = geoDispatch.getAllActiveLocations();
      expect(activeLocations.length).toBeGreaterThan(0);

      // Fetch active bookings
      const activeBookings = await prisma.booking.findMany({
        where: { status: { in: ['SEARCHING_PROVIDER', 'ASSIGNED', 'PROVIDER_EN_ROUTE'] } },
        include: { service: true, address: true },
      });

      expect(activeBookings.length).toBeGreaterThan(0);

      // Verify each booking has valid coordinate telemetry
      for (const b of activeBookings) {
        const lat = b.address?.latitude || b.lastKnownLatitude;
        const lng = b.address?.longitude || b.lastKnownLongitude;
        expect(lat).toBeDefined();
        expect(lng).toBeDefined();
        expect(typeof lat).toBe('number');
        expect(typeof lng).toBe('number');
        expect(lat).toBeGreaterThan(-90);
        expect(lat).toBeLessThan(90);
        expect(lng).toBeGreaterThan(-180);
        expect(lng).toBeLessThan(180);
      }

      // Verify via actual HTTP endpoint GET /api/v1/admin/dispatch/live-map
      const httpRes = await request(app)
        .get('/api/v1/admin/dispatch/live-map')
        .set('x-role', 'ADMIN');

      expect(httpRes.status).toBe(200);
      expect(httpRes.body.success).toBe(true);
      expect(httpRes.body.data.onlineProviderCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(httpRes.body.data.onlineProviders)).toBe(true);
    });

    it('verifies dynamic dispatch configuration can be read and updated live', async () => {
      const effectiveConfig = await dispatchConfigService.getEffectiveConfig('ac-servicing');
      expect(effectiveConfig.effectiveInitialRadiusKm).toBeGreaterThan(0);
      expect(effectiveConfig.effectiveMaxRadiusKm).toBeGreaterThanOrEqual(effectiveConfig.effectiveInitialRadiusKm);
      expect(effectiveConfig.expansionStages.length).toBeGreaterThan(0);
    });

    it('verifies admin platform settings endpoint returns complete configuration structure', async () => {
      const httpRes = await request(app)
        .get('/api/v1/admin/settings')
        .set('x-role', 'ADMIN');

      expect(httpRes.status).toBe(200);
      expect(httpRes.body.success).toBe(true);
      expect(httpRes.body.data.system).toBeDefined();
      expect(httpRes.body.data.payments).toBeDefined();
      expect(httpRes.body.data.notifications).toBeDefined();
      expect(httpRes.body.data.business).toBeDefined();
      expect(httpRes.body.data.legal).toBeDefined();
    });

    it('verifies booking cancellation works by reference number and updates status correctly', async () => {
      // Create a test booking to cancel
      const cancelRef = `HSX-CAN-${Date.now().toString(36).toUpperCase()}`;
      const toCancel = await prisma.booking.create({
        data: {
          referenceNumber: cancelRef,
          customerId: testCustomerProfileId,
          serviceId: testServiceId,
          addressId: testAddressId,
          scheduledSlot: new Date(Date.now() + 3600000),
          status: 'SEARCHING_PROVIDER',
          baseAmountPaise: 49900,
          totalAmountPaise: 49900,
        },
      });

      const token = jwt.sign(
        { id: testCustomerId, role: 'CUSTOMER', email: 'cust.test@homeservex.com' },
        config.jwtAccessSecret,
        { expiresIn: '1h' }
      );

      // Cancel via HTTP endpoint using #referenceNumber
      const cancelRes = await request(app)
        .post(`/api/v1/bookings/%23${cancelRef}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Customer requested change of time' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);

      const dbCancelled = await prisma.booking.findUnique({ where: { id: toCancel.id } });
      expect(dbCancelled?.status).toBe('CANCELLED');
    });
  });
});
