import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../apps/api/src/app.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';
import { enterpriseService } from '../../apps/api/src/modules/enterprise/enterprise.service.js';
import jwt from 'jsonwebtoken';
import { config } from '../../apps/api/src/config/env.js';

describe('HOMESERVEX 2.0 — ENTERPRISE MASTER SYSTEM VERIFICATION', () => {
  const app = createApp();

  let customerUser: any;
  let customerProfile: any;
  let providerUser: any;
  let providerProfile: any;
  let adminUser: any;
  let testAddress: any;
  let testService: any;
  let testBooking: any;

  let customerToken: string;
  let providerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Initialize all enterprise tables & catalogues
    await enterpriseService.initEnterpriseTables();

    // 2. Create Test Category & Service
    const category = await prisma.serviceCategory.upsert({
      where: { slug: 'ac-appliance-repair' },
      update: {},
      create: {
        name: 'AC & Appliance Repair',
        slug: 'ac-appliance-repair',
        description: 'Split AC Power Jet Cleaning, gas top-ups & compressor repairs',
        displayOrder: 1,
        isActive: true,
      },
    });

    testService = await prisma.service.upsert({
      where: { slug: 'split-ac-power-jet-master-2' },
      update: {},
      create: {
        categoryId: category.id,
        name: 'Split AC Power Jet Deep Clean 2.0',
        slug: 'split-ac-power-jet-master-2',
        description: 'Comprehensive high-pressure coil wash, drain pipe flush and gas leakage check',
        basePricePaise: 49900,
        estimatedDurationMinutes: 60,
        rating: 4.9,
        isActive: true,
      },
    });

    // 3. Create Users
    const custEmail = `cust_ent_${Date.now()}@homeservex.com`;
    customerUser = await prisma.user.create({
      data: {
        email: custEmail,
        phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hash',
        name: 'Enterprise Customer',
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
        streetAddress: 'Flat 402, Silver Oak Towers, Salt Lake Sector V',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700091',
        latitude: 22.5726,
        longitude: 88.3639,
      },
    });

    const provEmail = `prov_ent_${Date.now()}@homeservex.com`;
    providerUser = await prisma.user.create({
      data: {
        email: provEmail,
        phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hash',
        name: 'Enterprise Partner (Ramesh)',
        role: 'PROVIDER',
        status: 'ACTIVE',
        providerProfile: {
          create: {
            skills: JSON.stringify(['ac-appliance-repair']),
            verificationStatus: 'APPROVED',
            availabilityStatus: 'ONLINE',
            ratingAverage: 4.9,
            currentLatitude: 22.5728,
            currentLongitude: 88.3640,
          },
        },
      },
      include: { providerProfile: true },
    });
    providerProfile = providerUser.providerProfile;

    adminUser = await prisma.user.create({
      data: {
        email: `admin_ent_${Date.now()}@homeservex.com`,
        phone: `+9196${Math.floor(10000000 + Math.random() * 90000000)}`,
        passwordHash: 'hash',
        name: 'Admin Supervisor',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Create Test Booking
    testBooking = await prisma.booking.create({
      data: {
        referenceNumber: 'HSX' + Math.floor(100000 + Math.random() * 900000),
        customerId: customerProfile.id,
        serviceId: testService.id,
        addressId: testAddress.id,
        scheduledSlot: new Date(),
        status: 'IN_PROGRESS',
        assignedProviderId: providerProfile.id,
        baseAmountPaise: 49900,
        taxAmountPaise: 8982,
        totalAmountPaise: 58882,
      },
    });

    customerToken = jwt.sign({ id: customerUser.id, role: 'CUSTOMER', email: customerUser.email }, config.jwtAccessSecret, { expiresIn: '1h' });
    providerToken = jwt.sign({ id: providerUser.id, role: 'PROVIDER', email: providerUser.email }, config.jwtAccessSecret, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: adminUser.id, role: 'ADMIN', email: adminUser.email }, config.jwtAccessSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    try {
      if (testBooking?.id) {
        await prisma.booking.deleteMany({ where: { id: testBooking.id } });
      }
      if (testAddress?.id) {
        await prisma.address.deleteMany({ where: { id: testAddress.id } });
      }
      const userIds = [customerUser?.id, providerUser?.id, adminUser?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch {}
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 1: Smart Recommendation Engine
  // ══════════════════════════════════════════════════════════════════════════
  it('1. verifies Smart Recommendation Engine returns ranked services with seasonal metadata', async () => {
    const res = await request(app)
      .get('/api/v1/services/recommendations?lat=22.5726&lng=88.3639&season=SUMMER');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.seasonalTheme).toBe('SUMMER');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].recommendationReason).toBeDefined();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 2: Customer Membership & Loyalty Points
  // ══════════════════════════════════════════════════════════════════════════
  it('2. verifies Customer Membership enrollment and loyalty points redemption', async () => {
    // 1. Fetch Membership Plans
    const plansRes = await request(app).get('/api/v1/memberships/plans');
    expect(plansRes.status).toBe(200);
    expect(plansRes.body.data.length).toBeGreaterThanOrEqual(1);

    // 2. Subscribe to Club Plus
    const subRes = await request(app)
      .post('/api/v1/memberships/subscribe')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ planSlug: 'club-plus-monthly' });

    expect(subRes.status).toBe(200);
    expect(subRes.body.data.status).toBe('ACTIVE');
    expect(subRes.body.data.discountPercent).toBe(10);

    // 3. Loyalty Balance
    const loyRes = await request(app)
      .get(`/api/v1/customers/loyalty?customerId=${customerProfile.id}`);
    expect(loyRes.status).toBe(200);
    expect(loyRes.body.data.availablePoints).toBeGreaterThanOrEqual(100);

    // 4. Redeem Points
    const redRes = await request(app)
      .post('/api/v1/customers/loyalty/redeem')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ customerId: customerProfile.id, points: 50 });

    expect(redRes.status).toBe(200);
    expect(redRes.body.data.pointsRedeemed).toBe(50);
    expect(redRes.body.data.discountPaise).toBe(2500); // 50 * ₹0.50 = ₹25.00
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 3: Digital Job Checklists & Work Evidence
  // ══════════════════════════════════════════════════════════════════════════
  it('3. verifies Provider Digital Checklist completion and Before/After Work Evidence upload', async () => {
    // 1. Get Checklist
    const chkRes = await request(app)
      .get(`/api/v1/bookings/${testBooking.id}/checklist`);
    expect(chkRes.status).toBe(200);
    expect(chkRes.body.data.items.length).toBeGreaterThanOrEqual(4);

    // 2. Mark mandatory items complete
    const allIds = chkRes.body.data.items.map((i: any) => i.id);
    const updateRes = await request(app)
      .put(`/api/v1/bookings/${testBooking.id}/checklist`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ completedItems: allIds });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.allMandatoryPassed).toBe(true);

    // 3. Upload Before & After Work Evidence
    const evBefore = await request(app)
      .post(`/api/v1/bookings/${testBooking.id}/evidence`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        stage: 'BEFORE_WORK',
        photoUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e'],
        notes: 'Pre-service dirty coil inspected',
      });
    expect(evBefore.status).toBe(201);
    expect(evBefore.body.data.stage).toBe('BEFORE_WORK');

    const evGet = await request(app)
      .get(`/api/v1/bookings/${testBooking.id}/evidence`);
    expect(evGet.status).toBe(200);
    expect(evGet.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 4: Service Warranty & Dispute Resolution Desk
  // ══════════════════════════════════════════════════════════════════════════
  it('4. verifies 30-Day Service Warranty claim and Admin Dispute resolution', async () => {
    // 1. Activate Warranty for booking
    const war = await enterpriseService.activateBookingWarranty(testBooking.id, 30);
    expect(war.status).toBe('ACTIVE');

    // 2. Customer submits claim
    const claimRes = await request(app)
      .post('/api/v1/warranty/claims')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        warrantyId: war.warrantyId,
        claimReason: 'Cooling low after 3 days of service',
      });
    expect(claimRes.status).toBe(201);
    expect(claimRes.body.data.status).toBe('PENDING');

    // 3. Admin investigates and approves rework
    const claimId = claimRes.body.data.claimId;
    const adminRes = await request(app)
      .patch(`/api/v1/admin/warranty/claims/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', adminNotes: 'Approved for free doorstep rework.' });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.status).toBe('APPROVED');

    // 4. File a dispute
    const dspRes = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBooking.id,
        disputeType: 'DAMAGE',
        description: 'Plastic clip on outer panel cracked during cleaning',
      });
    expect(dspRes.status).toBe(201);
    expect(dspRes.body.data.status).toBe('OPEN');

    // 5. Admin resolves dispute with partial refund
    const dspId = dspRes.body.data.disputeId;
    const resDispute = await request(app)
      .patch(`/api/v1/admin/disputes/${dspId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED_REFUND', refundAmountPaise: 49900, adminDecision: 'Refund credited for damaged plastic cover.' });
    expect(resDispute.status).toBe(200);
    expect(resDispute.body.data.status).toBe('RESOLVED_REFUND');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 5: Video Consultation & Quote-to-Booking Generation
  // ══════════════════════════════════════════════════════════════════════════
  it('5. verifies Video Consultation workflow: Request -> Specialist Quote -> Auto-Booking', async () => {
    // 1. Request Video Consultation
    const reqCon = await request(app)
      .post('/api/v1/consultations/request')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ serviceId: testService.id, notes: 'Water dripping from indoor split AC' });
    expect(reqCon.status).toBe(201);
    expect(reqCon.body.data.sessionToken).toBeDefined();

    const conId = reqCon.body.data.consultationId;

    // 2. Specialist submits quotation after video diagnostic
    const quoteRes = await request(app)
      .post(`/api/v1/consultations/${conId}/quote`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ quotedAmountPaise: 69900, findingsNotes: 'Blocked drain tray and dusty cooling blower fan' });
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.data.quoteStatus).toBe('SUBMITTED');

    // 3. Customer accepts quote -> provisions real booking
    const acceptRes = await request(app)
      .post(`/api/v1/consultations/${conId}/accept-quote`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: testAddress.id });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.bookingId).toBeDefined();
    expect(acceptRes.body.data.quoteStatus).toBe('ACCEPTED');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 6: Training Academy, Certifications & Provider Performance
  // ══════════════════════════════════════════════════════════════════════════
  it('6. verifies Training Academy quiz assessment passing and Provider Performance Index', async () => {
    // 1. Fetch Training Courses
    const coursesRes = await request(app).get('/api/v1/training/courses');
    expect(coursesRes.status).toBe(200);
    expect(coursesRes.body.data.length).toBeGreaterThanOrEqual(1);

    const course = coursesRes.body.data[0];

    // 2. Submit quiz with passing answers
    const answers = {
      q1: '220-250 PSI',
      q2: 'Yes, mandatory isolation',
      q3: '8-12°C',
    };

    const quizRes = await request(app)
      .post(`/api/v1/training/courses/${course.id}/submit-assessment`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ answers });
    expect(quizRes.status).toBe(200);
    expect(quizRes.body.data.passed).toBe(true);
    expect(quizRes.body.data.certificationIssued).toBe(true);

    // 3. Fetch Provider Performance Metrics
    const perfRes = await request(app)
      .get(`/api/v1/providers/performance?providerId=${providerProfile.id}`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(perfRes.status).toBe(200);
    expect(perfRes.body.data.performanceScore).toBeGreaterThanOrEqual(80);
    expect(perfRes.body.data.acceptanceRatePercent).toBeGreaterThanOrEqual(90);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 7: AI HomeServeX Assistant & Advanced Business Intelligence
  // ══════════════════════════════════════════════════════════════════════════
  it('7. verifies AI Assistant diagnosis query and Admin Business Intelligence', async () => {
    // 1. Query AI Assistant
    const aiRes = await request(app)
      .post('/api/v1/ai/assistant/chat')
      .send({ query: 'My AC is leaking water from the indoor unit' });
    expect(aiRes.status).toBe(200);
    expect(aiRes.body.data.diagnosis).toContain('leak');
    expect(aiRes.body.data.recommendedService).toBeDefined();
    expect(aiRes.body.data.recommendedService.priceRupees).toBeGreaterThan(0);

    // 2. Admin BI Analytics
    const biRes = await request(app)
      .get('/api/v1/admin/analytics/business-intelligence')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(biRes.status).toBe(200);
    expect(biRes.body.data.totalOrders).toBeGreaterThanOrEqual(1);
    expect(biRes.body.data.fulfillmentRatePercent).toBeGreaterThan(0);

    // 3. Admin Demand Forecast
    const fcRes = await request(app)
      .get('/api/v1/admin/analytics/demand-forecast')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(fcRes.status).toBe(200);
    expect(fcRes.body.data.clusters.length).toBeGreaterThan(0);
    expect(fcRes.body.data.peakBookingHours.length).toBeGreaterThan(0);
  });
});
