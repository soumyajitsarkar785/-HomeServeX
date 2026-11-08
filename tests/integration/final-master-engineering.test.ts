import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../apps/api/src/lib/prisma.js';
import { geoDispatch } from '../../apps/api/src/lib/geoDispatch.js';
import { commissionEngine } from '../../apps/api/src/lib/commissionEngine.js';
import { subscriptionEngine } from '../../apps/api/src/lib/subscriptionEngine.js';
import { walletLedgerService } from '../../apps/api/src/lib/walletLedgerService.js';
import { latLngToCell } from 'h3-js';

describe('HOMESERVEX FINAL MASTER ENGINEERING — FULL SPECIFICATION TEST SUITE', () => {
  let customerUser: any;
  let customerProfile: any;
  let providerUserNormal: any;
  let providerProfileNormal: any;
  let providerUserSubscribed: any;
  let providerProfileSubscribed: any;
  let testService: any;
  let testCategory: any;
  let testAddress: any;

  beforeAll(async () => {
    // 1. Ensure test Category & Service
    testCategory = await prisma.serviceCategory.upsert({
      where: { slug: 'master-ac-repair' },
      update: {},
      create: {
        name: 'Master AC Repair',
        slug: 'master-ac-repair',
        description: 'Comprehensive Master AC diagnostics and servicing',
        iconUrl: 'Wrench',
        displayOrder: 1,
      },
    });

    testService = await prisma.service.upsert({
      where: { slug: 'master-jet-cleaning' },
      update: {},
      create: {
        name: 'Master AC Power Jet Clean',
        slug: 'master-jet-cleaning',
        description: 'High-pressure foam jet cleaning for indoor and outdoor AC units',
        categoryId: testCategory.id,
        basePricePaise: 100000, // ₹1,000.00
        estimatedDurationMinutes: 60,
      },
    });

    // 2. Create Test Customer
    const custEmail = `cust_master_${Date.now()}@homeservex.com`;
    customerUser = await prisma.user.create({
      data: {
        email: custEmail,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hashed_password_test',
        name: 'Master Test Customer',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        customerProfile: { create: {} },
      },
      include: { customerProfile: true },
    });
    customerProfile = customerUser.customerProfile;

    testAddress = await prisma.address.create({
      data: {
        customerId: customerProfile.id,
        label: 'Home',
        streetAddress: '12 South Park, Joynagar Sector 1',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700145',
        latitude: 22.1818,
        longitude: 88.4282,
        isDefault: true,
      },
    });

    // 3. Create Normal Provider (Type A: 15% Commission)
    const provEmailNormal = `prov_normal_${Date.now()}@homeservex.com`;
    providerUserNormal = await prisma.user.create({
      data: {
        email: provEmailNormal,
        phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hashed_password_test',
        name: 'Normal Partner (15% Comm)',
        role: 'PROVIDER',
        status: 'ACTIVE',
        providerProfile: {
          create: {
            skills: JSON.stringify(['master-jet-cleaning', 'appliance-repair']),
            verificationStatus: 'APPROVED',
            availabilityStatus: 'ONLINE',
            ratingAverage: 4.85,
            currentLatitude: 22.1820,
            currentLongitude: 88.4280,
            lastLocationUpdatedAt: new Date(),
          },
        },
      },
      include: { providerProfile: true },
    });
    providerProfileNormal = providerUserNormal.providerProfile;

    // 4. Create Subscribed Pro Provider (Type B: 0% Commission)
    const provEmailSub = `prov_sub_${Date.now()}@homeservex.com`;
    providerUserSubscribed = await prisma.user.create({
      data: {
        email: provEmailSub,
        phone: `+9196${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hashed_password_test',
        name: 'Pro Partner (0% Comm)',
        role: 'PROVIDER',
        status: 'ACTIVE',
        providerProfile: {
          create: {
            skills: JSON.stringify(['master-jet-cleaning', 'appliance-repair']),
            verificationStatus: 'APPROVED',
            availabilityStatus: 'ONLINE',
            ratingAverage: 4.95,
            currentLatitude: 22.1825,
            currentLongitude: 88.4285,
            lastLocationUpdatedAt: new Date(),
          },
        },
      },
      include: { providerProfile: true },
    });
    providerProfileSubscribed = providerUserSubscribed.providerProfile;

    // Grant 30-day Active Pro Subscription to Subscribed Provider
    await subscriptionEngine.grantPromotionalSubscription({
      providerId: providerProfileSubscribed.id,
      durationDays: 30,
      planSlug: 'monthly-premium',
      adminUser: 'master-admin@homeservex.com',
      reason: 'Pro Tier Verification',
    });
  });

  afterAll(async () => {
    try {
      if (customerProfile?.id) {
        await prisma.booking.deleteMany({ where: { customerId: customerProfile.id } });
        await prisma.address.deleteMany({ where: { customerId: customerProfile.id } });
      }
      const userIds = [customerUser?.id, providerUserNormal?.id, providerUserSubscribed?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch {}
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: H3 Geospatial Hexagonal Grid Indexing & Atomic Transitions
  // ═══════════════════════════════════════════════════════════════════════════
  it('should compute exact H3 resolution 8 cells and atomically transition cells without inflating counts', () => {
    const lat1 = 22.1818;
    const lng1 = 88.4282;
    const expectedCell1 = latLngToCell(lat1, lng1, 8);

    // Initial ping
    const res1 = geoDispatch.recordPing({
      providerId: providerProfileNormal.id,
      latitude: lat1,
      longitude: lng1,
      accuracyMeters: 4.0,
      speedKmh: 0,
      isAvailable: true,
      skills: ['master-jet-cleaning'],
    });

    expect(res1.h3Cell).toBe(expectedCell1);
    expect(res1.recommendedPingIntervalSec).toBeGreaterThanOrEqual(15); // stationary

    const heatmap1 = geoDispatch.getH3HeatmapData();
    const cellData1 = heatmap1.find((c) => c.cellId === expectedCell1);
    expect(cellData1).toBeDefined();
    expect(cellData1!.totalCount).toBe(1);

    // Repeated ping inside the SAME cell — MUST NOT increment counters!
    geoDispatch.recordPing({
      providerId: providerProfileNormal.id,
      latitude: lat1 + 0.0001,
      longitude: lng1 + 0.0001,
      skills: ['master-jet-cleaning'],
    });

    const heatmap2 = geoDispatch.getH3HeatmapData();
    const cellData2 = heatmap2.find((c) => c.cellId === expectedCell1);
    expect(cellData2!.totalCount).toBe(1); // Counter deduplication guaranteed

    // Atomic Move to another H3 cell (e.g. 5 km away in Kolkata)
    const lat2 = 22.2400;
    const lng2 = 88.4600;
    const expectedCell2 = latLngToCell(lat2, lng2, 8);
    expect(expectedCell2).not.toBe(expectedCell1);

    geoDispatch.recordPing({
      providerId: providerProfileNormal.id,
      latitude: lat2,
      longitude: lng2,
      speedKmh: 35, // traveling fast on bike
      skills: ['master-jet-cleaning'],
    });

    const heatmap3 = geoDispatch.getH3HeatmapData();
    const oldCell = heatmap3.find((c) => c.cellId === expectedCell1);
    const newCell = heatmap3.find((c) => c.cellId === expectedCell2);

    expect(oldCell ? oldCell.totalCount : 0).toBe(0); // Atomically removed from old cell
    expect(newCell!.totalCount).toBe(1); // Atomically added to new cell
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Stale Location Pruning
  // ═══════════════════════════════════════════════════════════════════════════
  it('should prune stale provider telemetry when last ping exceeds TTL', () => {
    const dummyProviderId = `dummy_prov_${Date.now()}`;
    geoDispatch.recordPing({
      providerId: dummyProviderId,
      latitude: 22.1818,
      longitude: 88.4282,
      skills: ['master-jet-cleaning'],
    });

    expect(geoDispatch.getProviderLocation(dummyProviderId)).toBeDefined();

    // Force location timestamp to 120 seconds ago (beyond 60s TTL)
    const loc = (geoDispatch as any).locations.get(dummyProviderId);
    if (loc) {
      loc.lastPingAt = Date.now() - 120000;
    }

    const pruned = geoDispatch.pruneStaleLocations();
    expect(pruned.length).toBeGreaterThanOrEqual(1);
    expect(geoDispatch.getProviderLocation(dummyProviderId)).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Double-Entry Financial Settlement for Normal Provider (15% Commission)
  // Flow: Gross Credit (+₹1000) -> Commission Debit (-₹150) -> Net Impact (+₹850)
  // ═══════════════════════════════════════════════════════════════════════════
  it('should strictly execute Gross Credit (+₹1,000) followed by Commission Debit (-₹150) for normal provider', async () => {
    // 1. Create completed booking
    const booking = await prisma.booking.create({
      data: {
        referenceNumber: 'HSX' + Math.floor(100000 + Math.random() * 900000),
        customerId: customerProfile.id,
        serviceId: testService.id,
        addressId: testAddress.id,
        scheduledSlot: new Date(),
        status: 'COMPLETED',
        baseAmountPaise: 100000,
        optionsAmountPaise: 0,
        discountAmountPaise: 0,
        taxAmountPaise: 18000,
        totalAmountPaise: 118000,
        commissionAmountPaise: 15000, // 15% of ₹1,000 = ₹150
        providerEarningsPaise: 85000, // ₹850
        assignedProviderId: providerProfileNormal.id,
      },
    });

    // Initial wallet balance
    const walletBefore = await walletLedgerService.getOrCreateWallet(providerProfileNormal.id);
    const initialBalancePaise = walletBefore.balancePaise;

    // Execute authoritative settlement engine
    const settlement = await commissionEngine.settleCompletedBookingFinancials(booking.id, providerProfileNormal.id);

    expect(settlement.grossSubtotalPaise).toBe(100000); // ₹1,000.00
    expect(settlement.commissionPaise).toBe(15000); // ₹150.00
    expect(settlement.providerEarningsPaise).toBe(85000); // ₹850.00

    // Wallet balance must reflect EXACTLY +₹850 net
    const walletAfter = await walletLedgerService.getOrCreateWallet(providerProfileNormal.id);
    expect(walletAfter.balancePaise - initialBalancePaise).toBe(85000);

    // Verify Financial Ledger Entries: Exactly 2 transactions for this order
    const ledgers = await prisma.financialLedger.findMany({
      where: { bookingId: booking.id, providerId: providerProfileNormal.id },
      orderBy: [{ createdAt: 'asc' }, { type: 'asc' }],
    });

    expect(ledgers.length).toBe(2);

    const grossEntry = ledgers.find(l => l.category === 'GROSS_EARNING_CREDIT') || ledgers[0];
    const commEntry = ledgers.find(l => l.category === 'COMMISSION_DEBIT') || ledgers[1];

    // Entry 1: GROSS_EARNING_CREDIT = +100,000 paise (₹1,000)
    expect(grossEntry.type).toBe('CREDIT');
    expect(grossEntry.category).toBe('GROSS_EARNING_CREDIT');
    expect(grossEntry.amountPaise).toBe(100000);
    expect(grossEntry.balanceAfterPaise).toBe(initialBalancePaise + 100000);

    // Entry 2: COMMISSION_DEBIT = -15,000 paise (₹150)
    expect(commEntry.type).toBe('DEBIT');
    expect(commEntry.category).toBe('COMMISSION_DEBIT');
    expect(commEntry.amountPaise).toBe(15000);
    expect(commEntry.balanceAfterPaise).toBe(initialBalancePaise + 85000);

    // Verify Company Commission Ledger credit
    const companyLedger = await prisma.companyCommissionLedger.findFirst({
      where: { bookingId: booking.id },
    });
    expect(companyLedger).toBeDefined();
    expect(companyLedger!.commissionAmountPaise).toBe(15000);
    expect(companyLedger!.exemptSavingsPaise).toBe(0);
    expect(companyLedger!.status).toBe('SETTLED');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Subscription 0% Commission Tier Benefit
  // Flow: Gross Credit (+₹1,000) -> 0 Commission Debit -> Net Impact (+₹1,000)
  // ═══════════════════════════════════════════════════════════════════════════
  it('should apply 0% commission deduction for subscribed Pro provider and log savings in ledger', async () => {
    const booking = await prisma.booking.create({
      data: {
        referenceNumber: 'HSX' + Math.floor(100000 + Math.random() * 900000),
        customerId: customerProfile.id,
        serviceId: testService.id,
        addressId: testAddress.id,
        scheduledSlot: new Date(),
        status: 'COMPLETED',
        baseAmountPaise: 100000,
        optionsAmountPaise: 0,
        discountAmountPaise: 0,
        taxAmountPaise: 18000,
        totalAmountPaise: 118000,
        commissionAmountPaise: 0,
        providerEarningsPaise: 100000, // 100% earnings!
        assignedProviderId: providerProfileSubscribed.id,
      },
    });

    const walletBefore = await walletLedgerService.getOrCreateWallet(providerProfileSubscribed.id);
    const initialBalancePaise = walletBefore.balancePaise;

    const settlement = await commissionEngine.settleCompletedBookingFinancials(booking.id, providerProfileSubscribed.id);

    expect(settlement.grossSubtotalPaise).toBe(100000);
    expect(settlement.commissionPaise).toBe(0); // 0% commission!
    expect(settlement.providerEarningsPaise).toBe(100000);

    const walletAfter = await walletLedgerService.getOrCreateWallet(providerProfileSubscribed.id);
    expect(walletAfter.balancePaise - initialBalancePaise).toBe(100000); // 100% retained!

    // Verify Company Commission Ledger tracks savings without fake revenue
    const companyLedger = await prisma.companyCommissionLedger.findFirst({
      where: { bookingId: booking.id },
    });
    expect(companyLedger).toBeDefined();
    expect(companyLedger!.commissionAmountPaise).toBe(0); // No fake company revenue
    expect(companyLedger!.exemptSavingsPaise).toBe(15000); // ₹150 saved by Pro partner
    expect(companyLedger!.type).toBe('EXEMPT_SUBSCRIPTION_BENEFIT');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Financial Settlement Idempotency (Prevent Duplicate Crediting)
  // ═══════════════════════════════════════════════════════════════════════════
  it('should be strictly idempotent and prevent duplicate wallet credits on repeated settlement calls', async () => {
    const booking = await prisma.booking.create({
      data: {
        referenceNumber: 'HSX' + Math.floor(100000 + Math.random() * 900000),
        customerId: customerProfile.id,
        serviceId: testService.id,
        addressId: testAddress.id,
        scheduledSlot: new Date(),
        status: 'COMPLETED',
        baseAmountPaise: 100000,
        optionsAmountPaise: 0,
        discountAmountPaise: 0,
        taxAmountPaise: 18000,
        totalAmountPaise: 118000,
        commissionAmountPaise: 15000,
        providerEarningsPaise: 85000,
        assignedProviderId: providerProfileNormal.id,
      },
    });

    // 1st Settlement
    await commissionEngine.settleCompletedBookingFinancials(booking.id, providerProfileNormal.id);
    const walletAfterFirst = await walletLedgerService.getOrCreateWallet(providerProfileNormal.id);

    // 2nd Settlement (retried by network or webhook)
    await commissionEngine.settleCompletedBookingFinancials(booking.id, providerProfileNormal.id);
    const walletAfterSecond = await walletLedgerService.getOrCreateWallet(providerProfileNormal.id);

    // Balance must be IDENTICAL; no double crediting!
    expect(walletAfterSecond.balancePaise).toBe(walletAfterFirst.balancePaise);

    // Exactly 2 transactions must exist, not 4
    const entries = await prisma.financialLedger.findMany({
      where: { bookingId: booking.id, providerId: providerProfileNormal.id },
    });
    expect(entries.length).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: Provider Payout Lifecycle (Hold Locking -> Admin Approval -> Disbursement)
  // ═══════════════════════════════════════════════════════════════════════════
  it('should lock funds into hold upon payout request and deduct upon admin approval', async () => {
    const wallet = await walletLedgerService.getOrCreateWallet(providerProfileNormal.id);
    const balanceBefore = wallet.balancePaise;
    expect(balanceBefore).toBeGreaterThanOrEqual(50000); // has at least ₹500

    const payoutAmountPaise = 50000; // ₹500

    // Step 1: Provider requests payout
    const payoutReq = await walletLedgerService.requestPayout({
      providerId: providerProfileNormal.id,
      amountPaise: payoutAmountPaise,
      paymentMethod: 'UPI',
      accountDetails: { upiId: 'ramesh@okhdfcbank' },
    });

    expect(payoutReq.status).toBe('PENDING');

    // Available balance must decrease by payoutAmountPaise; locked in hold
    const walletAfterRequest = await walletLedgerService.getOrCreateWallet(providerProfileNormal.id);
    expect(walletAfterRequest.balancePaise).toBe(balanceBefore - payoutAmountPaise);

    // Step 2: Admin approves payout
    const processRes = await walletLedgerService.adminProcessPayout(
      payoutReq.id,
      'APPROVE',
      'finance-admin@homeservex.com',
      'Batch NEFT payout settled'
    );

    expect(processRes.success).toBe(true);
    expect(processRes.status).toBe('COMPLETED');
  });
});
